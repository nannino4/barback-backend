import { Injectable, Logger, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { GoogleUserInfoDto } from '../dto/google-user-info.dto';
import { GoogleTokenResponseDto } from '../dto/google-token-response.dto';
import { User, AuthProvider } from '../../user/schemas/user.schema';
import { UserService } from '../../user/user.service';
import { InvitationService } from '../../invitations/invitation.service';
import { Types } from 'mongoose';
import { OutGoogleAuthUrlDto } from '../dto/out.google-auth-url.dto';

@Injectable()
export class GoogleService 
{
    private readonly logger = new Logger(GoogleService.name);
    private readonly googleOauthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly redirectUri: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly userService: UserService,
        private readonly invitationService: InvitationService,
    ) 
    {
        this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID')!;
        this.clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET')!;
        this.redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI')!;

        if (!this.clientId || !this.clientSecret || !this.redirectUri) 
        {
            this.logger.error('Google OAuth configuration missing. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI');
        }
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
            throw new BadRequestException('Invalid authorization code');
        }
    }

    async getUserInfo(accessToken: string): Promise<GoogleUserInfoDto> 
    {
        this.logger.debug('Fetching user info from Google', 'GoogleService#getUserInfo');

        try 
        {
            const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const userInfo = response.data as GoogleUserInfoDto;
            
            if (!userInfo.verified_email) 
            {
                this.logger.warn('Google user email is not verified', 'GoogleService#getUserInfo');
                throw new UnauthorizedException('Google account email must be verified');
            }

            this.logger.debug(`Successfully fetched user info for: ${userInfo.email}`, 'GoogleService#getUserInfo');
            return userInfo;
        } 
        catch (error) 
        {
            if (axios.isAxiosError(error) && error.response?.status === 401) 
            {
                this.logger.warn('Invalid or expired Google access token', 'GoogleService#getUserInfo');
                throw new UnauthorizedException('Invalid or expired Google access token');
            }
            
            this.logger.error('Failed to fetch user info from Google', error instanceof Error ? error.stack : undefined, 'GoogleService#getUserInfo');
            throw new BadRequestException('Failed to fetch user information from Google');
        }
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
                throw new ConflictException(`An account with this email already exists using ${existingUserByEmail.authProvider} authentication`);
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

        // Process pending invitations for this new user
        try 
        {
            await this.invitationService.processPendingInvitationsForUser(
                user._id as Types.ObjectId,
                user.email,
            );
            this.logger.debug(`Processed pending invitations for Google user: ${user.email}`, 'GoogleService#findOrCreateUser');
        } 
        catch (error) 
        {
            this.logger.warn(
                `Failed to process pending invitations for Google user: ${user.email}`,
                error instanceof Error ? error.stack : undefined,
                'GoogleService#findOrCreateUser',
            );
            // Don't fail authentication if invitation processing fails
        }

        this.logger.debug(`User created successfully: ${user.email}`, 'GoogleService#findOrCreateUser');
        return user;
    }

}
