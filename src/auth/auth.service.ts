import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { User, AuthProvider } from '../user/schemas/user.schema';

@Injectable()
export class AuthService
{
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
    async validateUser(email: string, pass?: string, authProvider: AuthProvider = AuthProvider.EMAIL): Promise<Omit<User, 'hashedPassword'> | null>
    {
        const user = await this.userService.findByEmail(email);

        if (!user)
        {
            return null;
        }

        if (authProvider === AuthProvider.EMAIL)
        {
            if (!pass || !user.hashedPassword || !(await bcrypt.compare(pass, user.hashedPassword)))
            {
                return null;
            }
        }
        else if (user.authProvider !== authProvider)
        {
            // User exists but is registered with a different auth provider
            // This could be an error or a prompt to link accounts in a more complex system
            throw new UnauthorizedException(`User is registered with ${user.authProvider}, not ${authProvider}.`);
        }
        // For Google/OAuth, if the user exists and authProvider matches, we consider them validated at this stage
        // as the external provider has already authenticated them.

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hashedPassword, ...result } = user.toObject();
        return result;
    }

    async login(user: Omit<User, 'hashedPassword'>) // User object without password hash
    {
        const accessTokenPayload = {
            email: user.email,
            sub: user._id, // subject: userId
            role: user.role, // Corrected from user.roles to user.role
            type: 'access', // Differentiate token type
        };
        const refreshTokenPayload = {
            sub: user._id, // subject: userId
            type: 'refresh', // Differentiate token type
        };

        const accessToken = this.jwtService.sign(accessTokenPayload, {
            secret: this.configService.get<string>('JWT_SECRET'),
            expiresIn: this.configService.get<string>('JWT_EXPIRATION_TIME'),
        });

        const refreshToken = this.jwtService.sign(refreshTokenPayload, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME'),
        });

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
        };
    }

    async refreshToken(refreshTokenString: string)
    {
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
                throw new UnauthorizedException('Invalid token type for refresh');
            }

            const user = await this.userService.findOne(payload.sub);
            if (!user)
            {
                throw new UnauthorizedException('User not found for refresh token');
            }

            // User is valid, issue new tokens
            const newAccessTokenPayload = {
                email: user.email,
                sub: user._id,
                role: user.role,
                type: 'access',
            };
            const newRefreshTokenPayload = { // Payload for the new refresh token
                sub: user._id,
                type: 'refresh',
            };

            const newAccessToken = this.jwtService.sign(newAccessTokenPayload, {
                secret: this.configService.get<string>('JWT_SECRET'),
                expiresIn: this.configService.get<string>('JWT_EXPIRATION_TIME'),
            });

            const newRefreshToken = this.jwtService.sign(newRefreshTokenPayload, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME'),
            });

            return {
                access_token: newAccessToken,
                refresh_token: newRefreshToken, // Return the new refresh token
            };
        }
        catch (error)
        {
            // Log the error for debugging if needed
            // console.error('Refresh Token Error:', error.message);
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }

    // We will add methods for registration, password reset, etc. later

    async register(createUserDto: CreateUserDto): Promise<{ access_token: string, refresh_token: string, user: Omit<User, 'hashedPassword'> }>
    {
        if (createUserDto.authProvider === AuthProvider.GOOGLE)
        {
            if (!createUserDto.googleId)
            {
                throw new UnauthorizedException('Google ID is required for Google registration.');
            }
            if (createUserDto.password)
            {
                throw new UnauthorizedException('Password should not be provided for Google registration.');
            }
        }
        else if (createUserDto.authProvider === AuthProvider.EMAIL || !createUserDto.authProvider) // Default to EMAIL if not specified
        {
            if (!createUserDto.password)
            {
                throw new UnauthorizedException('Password is required for email registration.');
            }
            if (createUserDto.googleId)
            {
                throw new UnauthorizedException('Google ID should not be provided for email registration.');
            }
            createUserDto.authProvider = AuthProvider.EMAIL; // Ensure it's set
        }
        else
        {
            throw new UnauthorizedException('Unsupported authentication provider for registration.');
        }

        const existingUser = await this.userService.findByEmail(createUserDto.email);
        if (existingUser)
        {
            // If user exists and tries to register with a different provider, this is a conflict.
            // Or, if they try to re-register with the same email and provider.
            throw new ConflictException('User with this email already exists.');
        }

        // For Google registration, isEmailVerified can be assumed true.
        if (createUserDto.authProvider === AuthProvider.GOOGLE)
        {
            createUserDto.isEmailVerified = true;
        }

        const newUser = await this.userService.create(createUserDto);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hashedPassword, ...userResult } = newUser.toObject();

        const tokens = await this.login(userResult);

        return {
            ...tokens,
            user: userResult,
        };
    }
}
