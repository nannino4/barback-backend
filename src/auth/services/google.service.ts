import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { GoogleUserInfoDto } from '../dto/google-user-info.dto';
import { GoogleTokenResponseDto } from '../dto/google-token-response.dto';
import { User, AuthProvider } from '../../user/schemas/user.schema';
import { UserService } from '../../user/user.service';
import { InvitationService } from '../../invitation/invitation.service';
import { OutGoogleAuthUrlDto } from '../dto/out.google-auth-url.dto';
import { CustomLogger } from 'src/common/logger/custom.logger';
import {
    GoogleConfigurationException,
    GoogleTokenExchangeException,
    GoogleUserInfoException,
    GoogleTokenInvalidException,
    GoogleEmailNotVerifiedException,
    GoogleAccountLinkingException,
} from '../exceptions/oauth.exceptions';

@Injectable()
export class GoogleService 
{
    private readonly googleOauthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly redirectUri: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly userService: UserService,
        private readonly invitationService: InvitationService,
        private readonly logger : CustomLogger,
    ) 
    {
        this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID')!;
        this.clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET')!;
        this.redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI')!;

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

        this.logger.debug('GoogleService initialized with valid configuration', 'GoogleService#constructor');
    }

    generateAuthUrl(): OutGoogleAuthUrlDto
    {
        const state = crypto.randomBytes(32).toString('hex');
        
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: 'openid email profile',
            access_type: 'offline',
            prompt: 'consent',
            state: state,
        });

        const authUrl = `${this.googleOauthUrl}?${params.toString()}`;
        
        this.logger.debug('Generated Google OAuth URL', 'GoogleService#generateAuthUrl');
        return { authUrl, state };
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
