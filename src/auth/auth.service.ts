import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User, AuthProvider } from '../user/schemas/user.schema';
import { AccessTokenPayloadDto } from './dto/access-token-payload.dto';
import { RefreshTokenPayloadDto } from './dto/refresh-token-payload.dto';
import { RegisterEmailDto } from './dto/in.register-email.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { TokensDto } from './dto/out.tokens.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@Injectable()
export class AuthService
{
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async generateTokens(user: User): Promise<TokensDto>
    {
        this.logger.debug(`Generating tokens for user: ${user.email}`, 'AuthService#generateTokens');

        const accessTokenPayload: AccessTokenPayloadDto = {
            sub: user.id,
            type: 'access',
        };
        const refreshTokenPayload: RefreshTokenPayloadDto = {
            sub: user.id,
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

    async refreshToken(refreshTokenString: string) : Promise<TokensDto>
    {
        this.logger.debug('Refresh token process started', 'AuthService#refreshToken');
        try
        {
            const payload = await this.jwtService.verifyAsync<RefreshTokenPayloadDto>(
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

            this.logger.debug(`User ${user.email} validated for token refresh`, 'AuthService#refreshToken');
            const tokens = await this.generateTokens(user);
            this.logger.debug(`Tokens refreshed for user: ${user.email}`, 'AuthService#refreshToken');
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

    async loginEmail(email: string, pass: string): Promise<User>
    {
        this.logger.debug(`Authenticating user: ${email}`, 'AuthService#loginEmail');
        const user = await this.userService.findByEmail(email);

        if (!user)
        {
            this.logger.warn(`User not found: ${email}`, 'AuthService#loginEmail');
            throw new UnauthorizedException('Email or password is incorrect');
        }

        if (user.authProvider !== AuthProvider.EMAIL)
        {
            this.logger.warn(`User ${email} is not using EMAIL authentication`, 'AuthService#loginEmail');
            throw new UnauthorizedException(`The user did not emailRegister with EMAIL authentication, but with ${user.authProvider}`);
        }
        if (!pass || !user.hashedPassword || !(await bcrypt.compare(pass, user.hashedPassword)))
        {
            this.logger.warn(`Invalid password for user: ${email}`, 'AuthService#loginEmail');
            throw new UnauthorizedException('Email or password is incorrect');
        }

        this.logger.debug(`User ${email} authenticated successfully`, 'AuthService#loginEmail');
        return user;
    }

    async registerEmail(registerUserDto: RegisterEmailDto): Promise<RegisterResponseDto>
    {
        this.logger.debug(`Registration process started for user: ${registerUserDto.email}`, 'AuthService#registerEmail');
        const existingUserByEmail = await this.userService.findByEmail(registerUserDto.email);
        if (existingUserByEmail)
        {
            this.logger.warn(`User with email ${registerUserDto.email} already exists.`, 'AuthService#registerEmail');
            throw new ConflictException('Another user with this email already exists.');
        }
        const userData: CreateUserDto = new CreateUserDto();
        const saltOrRounds = 10;
        userData.hashedPassword = await bcrypt.hash(registerUserDto.password, saltOrRounds);
        userData.email = registerUserDto.email;
        userData.firstName = registerUserDto.firstName;
        userData.lastName = registerUserDto.lastName;
        if (registerUserDto.phoneNumber)
        {
            userData.phoneNumber = registerUserDto.phoneNumber;
        }
        const newUser = await this.userService.create(userData);
        this.logger.debug(`New user created: ${newUser.email}`, 'AuthService#registerEmail');
        const tokens = await this.generateTokens(newUser);
        this.logger.debug(`Tokens generated for new user: ${newUser.email}`, 'AuthService#registerEmail');
        return {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            user: newUser as any, // Will be transformed by ClassSerializerInterceptor
        };
    }

    async loginEmailWithUser(email: string, pass: string): Promise<LoginResponseDto>
    {
        this.logger.debug(`Authenticating user with user data: ${email}`, 'AuthService#loginEmailWithUser');
        const user = await this.loginEmail(email, pass);
        const tokens = await this.generateTokens(user);
        this.logger.debug(`Login successful with user data for: ${email}`, 'AuthService#loginEmailWithUser');
        
        return {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            user: user as any, // Will be transformed by ClassSerializerInterceptor
        };
    }
}
