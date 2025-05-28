import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { User, AuthProvider } from '../user/schemas/user.schema';

@Injectable()
export class AuthService
{
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    /**
     * Validates a user based on email and password (for EMAIL AuthProvider).
     * For other providers like Google, the validation is typically handled by the OAuth flow itself,
     * and a user record is created/retrieved based on the provider's user ID.
     * This method is primarily for the local email/password login strategy.
     */
    async validateUser(email: string, pass?: string, authProvider: AuthProvider = AuthProvider.EMAIL): Promise<User | null>
    {
        this.logger.log(`Validating user: ${email} with provider: ${authProvider}`, 'AuthService#validateUser');
        const user = await this.userService.findByEmail(email);

        if (!user)
        {
            this.logger.warn(`User not found: ${email}`, 'AuthService#validateUser');
            return null;
        }

        if (authProvider === AuthProvider.EMAIL)
        {
            if (!pass || !user.hashedPassword || !(await bcrypt.compare(pass, user.hashedPassword)))
            {
                this.logger.warn(`Invalid password for user: ${email}`, 'AuthService#validateUser');
                return null;
            }
        }
        else if (user.authProvider !== authProvider)
        {
            this.logger.warn(`User ${email} registered with ${user.authProvider}, not ${authProvider}.`, 'AuthService#validateUser');
            throw new UnauthorizedException(`User is registered with ${user.authProvider}, not ${authProvider}.`);
        }

        this.logger.log(`User ${email} validated successfully`, 'AuthService#validateUser');
        return user;
    }

    async login(user: User) : Promise<{ access_token: string, refresh_token: string }>
    {
        this.logger.log(`Login process started for user: ${user.email}`, 'AuthService#login');
        // Generate JWT tokens
        const tokens = await this.generateTokens(user);

        // Update last login time
        // await this.userService.updateLastLogin(user._id);
        this.logger.log(`Tokens generated for user: ${user.email}`, 'AuthService#login');
        return tokens;
    }

    async refreshToken(refreshTokenString: string) : Promise<{ access_token: string, refresh_token: string }>
    {
        this.logger.log('Refresh token process started', 'AuthService#refreshToken');
        try
        {
            const payload = await this.jwtService.verifyAsync(
                refreshTokenString,
                {
                    secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
                },
            );

            if (payload.type !== 'refresh')
            {
                this.logger.warn('Invalid token type for refresh', 'AuthService#refreshToken');
                throw new UnauthorizedException('Invalid token type for refresh');
            }

            const user = await this.userService.findById(payload.sub);
            if (!user)
            {
                this.logger.warn(`User not found for refresh token. User ID: ${payload.sub}`, 'AuthService#refreshToken');
                throw new UnauthorizedException('User not found for refresh token');
            }

            this.logger.log(`User ${user.email} validated for token refresh`, 'AuthService#refreshToken');
            // User is valid, issue new tokens
            const tokens = await this.generateTokens(user);
            this.logger.log(`Tokens refreshed for user: ${user.email}`, 'AuthService#refreshToken');
            return tokens;
        }
        catch (error)
        {
            if (error instanceof Error)
            {
                this.logger.error(`Refresh Token Error: ${error.message}`, error.stack, 'AuthService#refreshToken');
            }
            else
            {
                this.logger.error('Refresh Token Error: An unknown error occurred', 'AuthService#refreshToken');
            }
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }

    // We will add methods for registration, password reset, etc. later

    async register(createUserDto: CreateUserDto): Promise<{ access_token: string, refresh_token: string, user: User }>
    {
        this.logger.log(`Registration process started for user: ${createUserDto.email}`, 'AuthService#register');
        if (createUserDto.authProvider === AuthProvider.GOOGLE)
        {
            if (!createUserDto.googleId)
            {
                this.logger.warn(`Google ID is required for Google registration. User: ${createUserDto.email}`, 'AuthService#register');
                throw new UnauthorizedException('Google ID is required for Google registration.');
            }
            if (createUserDto.password)
            {
                this.logger.warn(`Password should not be provided for Google registration. User: ${createUserDto.email}`, 'AuthService#register');
                throw new UnauthorizedException('Password should not be provided for Google registration.');
            }
        }
        else if (createUserDto.authProvider === AuthProvider.EMAIL || !createUserDto.authProvider) // Default to EMAIL if not specified
        {
            if (!createUserDto.password)
            {
                this.logger.warn(`Password is required for email registration. User: ${createUserDto.email}`, 'AuthService#register');
                throw new UnauthorizedException('Password is required for email registration.');
            }
            if (createUserDto.googleId)
            {
                this.logger.warn(`Google ID should not be provided for email registration. User: ${createUserDto.email}`, 'AuthService#register');
                throw new UnauthorizedException('Google ID should not be provided for email registration.');
            }
            createUserDto.authProvider = AuthProvider.EMAIL; // Ensure it's set
        }
        else
        {
            this.logger.warn(`Unsupported authentication provider for registration: ${createUserDto.authProvider}. User: ${createUserDto.email}`, 'AuthService#register');
            throw new UnauthorizedException('Unsupported authentication provider for registration.');
        }

        const existingUser = await this.userService.findByEmail(createUserDto.email);
        if (existingUser)
        {
            this.logger.warn(`User with email ${createUserDto.email} already exists.`, 'AuthService#register');
            throw new ConflictException('User with this email already exists.');
        }

        // For Google registration, isEmailVerified can be assumed true.
        if (createUserDto.authProvider === AuthProvider.GOOGLE)
        {
            this.logger.log(`Setting isEmailVerified to true for Google user: ${createUserDto.email}`, 'AuthService#register');
            createUserDto.isEmailVerified = true;
        }

        const newUser = await this.userService.create(createUserDto);
        this.logger.log(`New user created: ${newUser.email}`, 'AuthService#register');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hashedPassword, ...userResult } = newUser.toObject();

        const tokens = await this.login(userResult);
        this.logger.log(`Tokens generated for new user: ${newUser.email}`, 'AuthService#register');

        return {
            ...tokens,
            user: userResult,
        };
    }

    private async generateTokens(user: User)
    {
        this.logger.debug(`Generating tokens for user: ${user.email}`, 'AuthService#generateTokens');
        const accessTokenPayload = {
            email: user.email,
            sub: user._id,
            role: user.role,
            type: 'access',
        };
        const refreshTokenPayload = {
            sub: user._id,
            type: 'refresh',
        };

        const accessToken = this.jwtService.sign(accessTokenPayload, {
            secret: this.configService.get<string>('JWT_SECRET'),
            expiresIn: this.configService.get<string>('JWT_EXPIRATION_TIME'),
        });

        const refreshToken = this.jwtService.sign(refreshTokenPayload, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME'),
        });
        this.logger.debug(`Tokens generated successfully for user: ${user.email}`, 'AuthService#generateTokens');
        return { access_token: accessToken, refresh_token: refreshToken };
    }
}
