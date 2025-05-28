import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, ConflictException, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';

@Controller('auth')
export class AuthController
{
    private readonly logger = new Logger(AuthController.name);

    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @HttpCode(HttpStatus.OK) // Explicitly set OK status for successful login
    async login(@Body() loginDto: LoginUserDto) // Login DTO might need an optional authProvider field if login endpoint handles multiple types
    {
        this.logger.log(`Login attempt for user: ${loginDto.email}`, 'AuthController#login');
        // Assuming loginDto might be extended to include authProvider if this endpoint handles more than just email/password
        // For now, it defaults to AuthProvider.EMAIL in validateUser if not provided
        const user = await this.authService.validateUser(loginDto.email, loginDto.password);
        if (!user)
        {
            this.logger.warn(`Invalid credentials for user: ${loginDto.email}`, 'AuthController#login');
            throw new UnauthorizedException('Invalid credentials');
        }
        this.logger.log(`User ${loginDto.email} authenticated successfully`, 'AuthController#login');
        const result = await this.authService.login(user);
        this.logger.log(`Login successful for user: ${loginDto.email}`, 'AuthController#login');
        return result;
    }

    @Post('refresh-token')
    @HttpCode(HttpStatus.OK)
    async refreshToken(@Body() refreshTokenDto: RefreshTokenDto)
    {
        this.logger.log('Refresh token attempt', 'AuthController#refreshToken');
        if (!refreshTokenDto.refresh_token)
        {
            this.logger.warn('Refresh token is missing', 'AuthController#refreshToken');
            throw new UnauthorizedException('Refresh token is missing');
        }
        const result = await this.authService.refreshToken(refreshTokenDto.refresh_token);
        this.logger.log('Token refreshed successfully', 'AuthController#refreshToken');
        return result;
    }

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() createUserDto: CreateUserDto)
    {
        this.logger.log(`Registration attempt for user: ${createUserDto.email}`, 'AuthController#register');
        try
        {
            const result = await this.authService.register(createUserDto);
            this.logger.log(`User ${createUserDto.email} registered successfully`, 'AuthController#register');
            return result;
        }
        catch (error)
        {
            if (error instanceof ConflictException)
            {
                this.logger.warn(`Registration failed for user ${createUserDto.email}: ${error.message}`, 'AuthController#register');
                throw new ConflictException(error.message);
            }
            // Check if error is an instance of Error to safely access message and stack
            if (error instanceof Error)
            {
                this.logger.error(`Unexpected error during registration for user ${createUserDto.email}: ${error.message}`, error.stack, 'AuthController#register');
            }
            else
            {
                this.logger.error(`Unexpected error during registration for user ${createUserDto.email}: An unknown error occurred`, 'AuthController#register');
            }
            // Handle other errors or rethrow them
            throw error;
        }
    }

    // Endpoints for password reset, email verification will be added later
}
