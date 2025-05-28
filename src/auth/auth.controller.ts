import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';

@Controller('auth')
export class AuthController
{
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @HttpCode(HttpStatus.OK) // Explicitly set OK status for successful login
    async login(@Body() loginDto: LoginUserDto) // Login DTO might need an optional authProvider field if login endpoint handles multiple types
    {
        // Assuming loginDto might be extended to include authProvider if this endpoint handles more than just email/password
        // For now, it defaults to AuthProvider.EMAIL in validateUser if not provided
        const user = await this.authService.validateUser(loginDto.email, loginDto.password);
        if (!user)
        {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user);
    }

    @Post('refresh-token')
    @HttpCode(HttpStatus.OK)
    async refreshToken(@Body() refreshTokenDto: RefreshTokenDto)
    {
        if (!refreshTokenDto.refresh_token)
        {
            throw new UnauthorizedException('Refresh token is missing');
        }
        return this.authService.refreshToken(refreshTokenDto.refresh_token);
    }

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() createUserDto: CreateUserDto)
    {
        try
        {
            return await this.authService.register(createUserDto);
        }
        catch (error)
        {
            if (error instanceof ConflictException)
            {
                throw new ConflictException(error.message);
            }
            // Handle other errors or rethrow them
            throw error;
        }
    }

    // Endpoints for password reset, email verification will be added later
}
