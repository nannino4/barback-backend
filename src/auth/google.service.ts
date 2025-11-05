import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import * as crypto from 'crypto';
import { GoogleUserInfoDto } from './dto/google-user-info.dto';
import { GoogleTokenResponseDto } from './dto/google-token-response.dto';
import { User, AuthProvider } from '../user/schemas/user.schema';
import { UserService } from '../user/user.service';
import { OutGoogleAuthUrlDto } from './dto/out.google-auth-url.dto';
import { CustomLogger } from 'src/common/logger/custom.logger';
import {
    GoogleConfigurationException,
    GoogleTokenExchangeException,
    GoogleUserInfoException,
    GoogleTokenInvalidException,
    GoogleEmailNotVerifiedException,
    GoogleAccountLinkingException,
    InvalidOAuthStateException,
} from './exceptions/oauth.exceptions';

@Injectable()
export class GoogleService 
{
    private readonly googleOauthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly redirectUri: string;
    private readonly oauthStateSecret: string;
    private readonly oauthStateExpiration: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly logger : CustomLogger,
    ) 
    {
        this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID')!;
        this.clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET')!;
        this.redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI')!;
        this.oauthStateSecret = this.configService.get<string>('JWT_OAUTH_STATE_SECRET')!;
        this.oauthStateExpiration = this.configService.get<string>('JWT_OAUTH_STATE_EXPIRATION_TIME')!;

        // Validate configuration and throw specific exceptions
        if (!this.clientId) 
        {
            this.logger.error('Google OAuth configuration missing: GOOGLE_CLIENT_ID', 'GoogleService#constructor');
            throw new GoogleConfigurationException('GOOGLE_CLIENT_ID');
        }
        
        if (!this.clientSecret) 
        {
            this.logger.error('Google OAuth configuration missing: GOOGLE_CLIENT_SECRET', 'GoogleService#constructor');
            throw new GoogleConfigurationException('GOOGLE_CLIENT_SECRET');
        }
        
        if (!this.redirectUri) 
        {
            this.logger.error('Google OAuth configuration missing: GOOGLE_REDIRECT_URI', 'GoogleService#constructor');
            throw new GoogleConfigurationException('GOOGLE_REDIRECT_URI');
        }

        if (!this.oauthStateSecret)
        {
            this.logger.error('Google OAuth configuration missing: JWT_OAUTH_STATE_SECRET', 'GoogleService#constructor');
            throw new GoogleConfigurationException('JWT_OAUTH_STATE_SECRET');
        }

        if (!this.oauthStateExpiration)
        {
            this.logger.error('Google OAuth configuration missing: JWT_OAUTH_STATE_EXPIRATION_TIME', 'GoogleService#constructor');
            throw new GoogleConfigurationException('JWT_OAUTH_STATE_EXPIRATION_TIME');
        }

        this.logger.debug('GoogleService initialized with valid configuration', 'GoogleService#constructor');
    }

    generateAuthUrl(): OutGoogleAuthUrlDto
    {
        // Generate signed JWT as state for stateless CSRF protection
        const statePayload = {
            purpose: 'google_oauth',
            timestamp: Date.now(),
            nonce: crypto.randomBytes(16).toString('hex'),
        };
        
        const state = this.jwtService.sign(statePayload, {
            secret: this.oauthStateSecret,
            expiresIn: this.oauthStateExpiration,
        });
        
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: 'openid email profile',
            state: state,
        });

        const authUrl = `${this.googleOauthUrl}?${params.toString()}`;
        
        this.logger.debug('Generated Google OAuth URL with signed state', 'GoogleService#generateAuthUrl');
        return { authUrl, state };
    }

    async validateOAuthState(state: string): Promise<void>
    {
        this.logger.debug('Validating OAuth state parameter', 'GoogleService#validateOAuthState');
        
        try 
        {
            const statePayload = await this.jwtService.verifyAsync(state, {
                secret: this.oauthStateSecret,
            });
            
            // Verify it's for OAuth purpose
            if (statePayload.purpose !== 'google_oauth') 
            {
                this.logger.warn('Invalid OAuth state: wrong purpose', 'GoogleService#validateOAuthState');
                throw new Error('Invalid state purpose');
            }
            
            this.logger.debug('OAuth state validated successfully', 'GoogleService#validateOAuthState');
        } 
        catch (error) 
        {
            this.logger.error(
                'OAuth state validation failed',
                error instanceof Error ? error.stack : undefined,
                'GoogleService#validateOAuthState'
            );
            throw new InvalidOAuthStateException();
        }
    }

    async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponseDto> 
    {
        this.logger.debug('Exchanging authorization code for tokens', 'GoogleService#exchangeCodeForTokens');
        
        try 
        {
            const response = await axios.post('https://oauth2.googleapis.com/token', {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: this.redirectUri,
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            this.logger.debug('Successfully exchanged code for tokens', 'GoogleService#exchangeCodeForTokens');
            return response.data;
        } 
        catch (error) 
        {
            this.logger.error('Failed to exchange authorization code for tokens', error instanceof Error ? error.stack : undefined, 'GoogleService#exchangeCodeForTokens');
            throw new GoogleTokenExchangeException();
        }
    }

    async getUserInfo(accessToken: string): Promise<GoogleUserInfoDto> 
    {
        this.logger.debug('Fetching user info from Google', 'GoogleService#getUserInfo');

        let userInfo: GoogleUserInfoDto;
        
        try 
        {
            const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            userInfo = response.data as GoogleUserInfoDto;
            this.logger.debug(`Successfully fetched user info for: ${userInfo.email}`, 'GoogleService#getUserInfo');
        } 
        catch (error) 
        {
            if (axios.isAxiosError(error) && error.response?.status === 401) 
            {
                this.logger.warn('Invalid or expired Google access token', 'GoogleService#getUserInfo');
                throw new GoogleTokenInvalidException();
            }
            
            this.logger.error('Failed to fetch user info from Google', error instanceof Error ? error.stack : undefined, 'GoogleService#getUserInfo');
            throw new GoogleUserInfoException();
        }

        // Business validation - separate from HTTP error handling
        if (!userInfo.verified_email) 
        {
            this.logger.warn('Google user email is not verified', 'GoogleService#getUserInfo');
            throw new GoogleEmailNotVerifiedException();
        }

        return userInfo;
    }

    async findOrCreateUser(googleUserInfo: GoogleUserInfoDto): Promise<User> 
    {
        this.logger.debug(`Finding or creating user for Google ID: ${googleUserInfo.id}`, 'GoogleService#findOrCreateUser');
        
        // First, try to find user by Google ID
        let user = await this.userService.findByGoogleId(googleUserInfo.id);
        if (user) 
        {
            this.logger.debug(`User found by Google ID: ${user.email}`, 'GoogleService#findOrCreateUser');
            return user;
        }

        // Try to find user by email
        const existingUserByEmail = await this.userService.findByEmail(googleUserInfo.email);
        
        if (existingUserByEmail) 
        {
            // Handle existing user with different auth provider
            if (existingUserByEmail.authProvider !== AuthProvider.EMAIL) 
            {
                this.logger.warn(`User ${googleUserInfo.email} exists with different auth provider: ${existingUserByEmail.authProvider}`, 'GoogleService#findOrCreateUser');
                throw new GoogleAccountLinkingException(existingUserByEmail.authProvider);
            }

            // Link Google account to existing email user
            this.logger.debug(`Linking Google account to existing email user: ${existingUserByEmail.email}`, 'GoogleService#findOrCreateUser');
            
            user = await this.userService.linkGoogleAccount(
                existingUserByEmail, 
                googleUserInfo.id, 
                googleUserInfo.picture
            );

            this.logger.debug(`Google account linked successfully for user: ${user.email}`, 'GoogleService#findOrCreateUser');
            return user;
        }

        // Create new user
        this.logger.debug(`Creating new Google user: ${googleUserInfo.email}`, 'GoogleService#findOrCreateUser');
        user = await this.userService.create({
            googleId: googleUserInfo.id,
            email: googleUserInfo.email,
            firstName: googleUserInfo.given_name || googleUserInfo.name?.split(' ')[0] || 'User',
            lastName: googleUserInfo.family_name || googleUserInfo.name?.split(' ').slice(1).join(' ') || '',
            profilePictureUrl: googleUserInfo.picture,
            authProvider: AuthProvider.GOOGLE,
            isEmailVerified: true, // Google emails are pre-verified
        });

        this.logger.debug(`User created successfully: ${user.email}`, 'GoogleService#findOrCreateUser');
        return user;
    }

}
