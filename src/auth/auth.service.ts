import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User, AuthProvider } from '../user/schemas/user.schema';
import { Types } from 'mongoose';
import { AccessTokenPayloadDto } from './dto/access-token-payload.dto';
import { RefreshTokenPayloadDto } from './dto/refresh-token-payload.dto';
import { RegisterEmailDto } from './dto/in.register-email.dto';
import { CreateUserDto } from '../user/dto/in.create-user.dto';
import { OutTokensDto } from './dto/out.tokens.dto';
import { OutAuthResponseDto } from './dto/out.auth-response.dto';
import { OutUserDto } from '../user/dto/out.user.dto';
import { EmailService } from '../email/email.service';
import { InvitationService } from '../invitation/invitation.service';
import { plainToClass } from 'class-transformer';
import {
    JwtConfigurationException,
    TokenGenerationException,
    InvalidRefreshTokenException,
    InvalidCredentialsException,
    WrongAuthProviderException,
    PasswordHashingException,
} from './exceptions/auth.exceptions';
import { 
    UserNotFoundByEmailException, 
    EmailAlreadyVerifiedException,
    InvalidPasswordResetTokenException,
} from '../user/exceptions/user.exceptions';
import { CustomLogger } from '../common/logger/custom.logger';

@Injectable()
export class AuthService
{
    private readonly jwtAccessTokenSecret: string;
    private readonly jwtAccessTokenExpiration: string;
    private readonly jwtRefreshTokenSecret: string;
    private readonly jwtRefreshTokenExpiration: string;

    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly emailService: EmailService,
        private readonly invitationService: InvitationService,
        private readonly logger: CustomLogger,
    )
    {
        
        // Validate JWT configuration on startup
        const accessSecret = this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET');
        if (!accessSecret)
        {
            throw new JwtConfigurationException('JWT_ACCESS_TOKEN_SECRET');
        }
        this.jwtAccessTokenSecret = accessSecret;

        const accessExpiration = this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION_TIME');
        if (!accessExpiration)
        {
            throw new JwtConfigurationException('JWT_ACCESS_TOKEN_EXPIRATION_TIME');
        }
        this.jwtAccessTokenExpiration = accessExpiration;

        const refreshSecret = this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET');
        if (!refreshSecret)
        {
            throw new JwtConfigurationException('JWT_REFRESH_TOKEN_SECRET');
        }
        this.jwtRefreshTokenSecret = refreshSecret;

        const refreshExpiration = this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION_TIME');
        if (!refreshExpiration)
        {
            throw new JwtConfigurationException('JWT_REFRESH_TOKEN_EXPIRATION_TIME');
        }
        this.jwtRefreshTokenExpiration = refreshExpiration;

        this.logger.debug('AuthService initialized with valid JWT configuration', 'AuthService#constructor');
    }

    async generateTokens(user: User): Promise<OutTokensDto>
    {
        this.logger.debug(`Generating tokens for user: ${user.email}`, 'AuthService#generateTokens');
        
        try
        {
            const accessTokenPayload: AccessTokenPayloadDto = {
                sub: user.id,
                type: 'access',
            };
            const refreshTokenPayload: RefreshTokenPayloadDto = {
                sub: user.id,
                type: 'refresh',
            };
            
            const accessToken = this.jwtService.sign(accessTokenPayload, {
                secret: this.jwtAccessTokenSecret,
                expiresIn: this.jwtAccessTokenExpiration,
            });
            
            const refreshToken = this.jwtService.sign(refreshTokenPayload, {
                secret: this.jwtRefreshTokenSecret,
                expiresIn: this.jwtRefreshTokenExpiration,
            });
            
            this.logger.debug(`Tokens generated successfully for user: ${user.email}`, 'AuthService#generateTokens');
            return { access_token: accessToken, refresh_token: refreshToken };
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Token generation failed for user ${user.email}: ${errorMessage}`, undefined, 'AuthService#generateTokens');
            throw new TokenGenerationException(errorMessage);
        }
    }

    async generateAuthResponse(user: User): Promise<OutAuthResponseDto>
    {
        this.logger.debug(`Generating auth response for user: ${user.email}`, 'AuthService#generateAuthResponse');
        const tokens = await this.generateTokens(user);
        const userDto = plainToClass(OutUserDto, user, { excludeExtraneousValues: true });
        
        const response: OutAuthResponseDto = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            user: userDto,
        };
        
        this.logger.debug(`Auth response generated successfully for user: ${user.email}`, 'AuthService#generateAuthResponse');
        return response;
    }

    async validateRefreshToken(refreshTokenString: string) : Promise<OutAuthResponseDto>
    {
        this.logger.debug('Refresh token process started', 'AuthService#validateRefreshToken');
        
        let user: User;
        try
        {
            // Verify JWT token
            const payload = await this.jwtService.verifyAsync<RefreshTokenPayloadDto>(
                refreshTokenString,
                {
                    secret: this.jwtRefreshTokenSecret,
                },
            );
            
            // Validate token type
            if (payload.type !== 'refresh')
            {
                throw new Error('Invalid token type');
            }
            
            // Find user (throws if not found)
            user = await this.userService.findById(new Types.ObjectId(payload.sub));
            if (!user)
            {
                throw new Error('User not found');
            }
        }
        catch (error)
        {
            // Convert all token validation errors to InvalidRefreshTokenException for security
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Refresh Token Error: ${errorMessage}`, error instanceof Error ? error.stack : undefined, 'AuthService#validateRefreshToken');
            throw new InvalidRefreshTokenException();
        }
        
        // Generate response (outside try block - let TokenGenerationException bubble up)
        this.logger.debug(`User ${user.email} validated for token refresh`, 'AuthService#validateRefreshToken');
        const response = await this.generateAuthResponse(user);
        this.logger.debug(`Tokens refreshed for user: ${user.email}`, 'AuthService#validateRefreshToken');
        return response;
    }

    async loginEmail(email: string, pass: string): Promise<OutAuthResponseDto>
    {
        this.logger.debug(`Authenticating user: ${email}`, 'AuthService#loginEmail');
        const user = await this.userService.findByEmail(email);
        if (!user)
        {
            this.logger.warn(`User not found: ${email}`, 'AuthService#loginEmail');
            throw new InvalidCredentialsException();
        }
        if (user.authProvider !== AuthProvider.EMAIL)
        {
            this.logger.warn(`User ${email} is not using EMAIL authentication`, 'AuthService#loginEmail');
            throw new WrongAuthProviderException(user.authProvider);
        }
        if (!pass || !user.hashedPassword || !(await bcrypt.compare(pass, user.hashedPassword)))
        {
            this.logger.warn(`Invalid password for user: ${email}`, 'AuthService#loginEmail');
            throw new InvalidCredentialsException();
        }
        const response = await this.generateAuthResponse(user);
        this.logger.debug(`User ${email} authenticated successfully`, 'AuthService#loginEmail');
        return response;
    }

    async registerEmail(registerUserDto: RegisterEmailDto): Promise<OutAuthResponseDto>
    {
        this.logger.debug(`Registration process started for user: ${registerUserDto.email}`, 'AuthService#registerEmail');
        
        // Prepare user data
        const userData: CreateUserDto = new CreateUserDto();
        
        // Hash password with error handling
        try
        {
            const saltOrRounds = 10;
            userData.hashedPassword = await bcrypt.hash(registerUserDto.password, saltOrRounds);
        }
        catch (error)
        {
            this.logger.error('Password hashing failed during registration', 'AuthService#registerEmail');
            throw new PasswordHashingException();
        }
        
        userData.email = registerUserDto.email;
        userData.firstName = registerUserDto.firstName;
        userData.lastName = registerUserDto.lastName;
        if (registerUserDto.phoneNumber)
        {
            userData.phoneNumber = registerUserDto.phoneNumber;
        }
        
        const newUser = await this.userService.create(userData);
        this.logger.debug(`New user created: ${newUser.email}`, 'AuthService#registerEmail');
        
        // Process pending invitations for this user
        try 
        {
            await this.invitationService.processPendingInvitationsForUser(
                newUser._id as Types.ObjectId,
                newUser.email,
            );
            this.logger.debug(`Processed pending invitations for user: ${newUser.email}`, 'AuthService#registerEmail');
        } 
        catch (error) 
        {
            this.logger.warn(
                `Failed to process pending invitations for user: ${newUser.email}`, 'AuthService#registerEmail',
            );
            // Don't fail registration if invitation processing fails
        }
        
        // Send verification email
        try 
        {
            await this.sendVerificationEmail(newUser.email);
        } 
        catch (error) 
        {
            this.logger.warn(`Failed to send verification email to ${newUser.email}`, 'AuthService#registerEmail');
            // Don't fail registration if email sending fails
        }
        
        const response = await this.generateAuthResponse(newUser);
        this.logger.debug(`Auth response generated for new user: ${newUser.email}`, 'AuthService#registerEmail');
        return response;
    }

    async sendVerificationEmail(email: string): Promise<void>
    {
        this.logger.debug(`Sending verification email to: ${email}`, 'AuthService#sendVerificationEmail');
        const user = await this.userService.findByEmail(email);
        if (!user)
        {
            this.logger.warn(`User not found for email verification: ${email}`, 'AuthService#sendVerificationEmail');
            throw new UserNotFoundByEmailException(email);
        }

        if (user.isEmailVerified)
        {
            this.logger.debug(`User ${email} is already verified`, 'AuthService#sendVerificationEmail');
            throw new EmailAlreadyVerifiedException(email);
        }

        const token = await this.userService.generateEmailVerificationToken(user._id as Types.ObjectId);
        const emailOptions = this.emailService.generateVerificationEmail(email, token);
        
        await this.emailService.sendEmail(emailOptions);
        this.logger.debug(`Verification email sent to: ${email}`, 'AuthService#sendVerificationEmail');
    }

    async verifyEmail(token: string): Promise<void>
    {
        this.logger.debug('Processing email verification', 'AuthService#verifyEmail');
        await this.userService.verifyEmail(token);
        this.logger.debug('Email verification completed successfully', 'AuthService#verifyEmail');
    }

    async forgotPassword(email: string): Promise<void>
    {
        this.logger.debug(`Processing forgot password request for: ${email}`, 'AuthService#forgotPassword');
        
        try 
        {
            const token = await this.userService.generatePasswordResetToken(email);
            
            if (token)
            {
                const emailOptions = this.emailService.generatePasswordResetEmail(email, token);
                await this.emailService.sendEmail(emailOptions);
                this.logger.debug(`Password reset email sent to: ${email}`, 'AuthService#forgotPassword');
            }
            else
            {
                this.logger.debug(`No valid user found for password reset: ${email}`, 'AuthService#forgotPassword');
            }
        }
        catch (error)
        {
            // Log the error but don't expose details to prevent information leakage
            this.logger.error(`Failed to process password reset request for: ${email}`, error instanceof Error ? error.stack : undefined, 'AuthService#forgotPassword');
            
            // For security, we still return success even if email sending fails
            // This prevents enumeration attacks but logs the actual error for debugging
        }
        
        // Always return success to prevent email enumeration
    }

    async resetPassword(token: string, newPassword: string): Promise<void>
    {
        this.logger.debug('Processing password reset', 'AuthService#resetPassword');
        await this.userService.resetPassword(token, newPassword);
        this.logger.debug('Password reset completed successfully', 'AuthService#resetPassword');
    }

    async validatePasswordResetToken(token: string): Promise<void>
    {
        this.logger.debug('Validating password reset token', 'AuthService#validatePasswordResetToken');
        const user = await this.userService.findByPasswordResetToken(token);
        
        if (!user)
        {
            this.logger.warn('Invalid or expired password reset token', 'AuthService#validatePasswordResetToken');
            throw new InvalidPasswordResetTokenException();
        }
        
        this.logger.debug('Password reset token is valid', 'AuthService#validatePasswordResetToken');
    }
}
