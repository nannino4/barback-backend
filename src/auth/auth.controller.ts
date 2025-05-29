import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmailLoginDto } from './dto/email-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { EmailRegisterDto } from './dto/email-register.dto';

@Controller('auth')
export class AuthController
{
    private readonly logger = new Logger(AuthController.name);

    constructor(private readonly authService: AuthService) {}

    @Post('register/email')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() registerUserDto: EmailRegisterDto)
    {
        this.logger.debug(`Registration attempt for user: ${registerUserDto.email}`, 'AuthController#register');
        const result = await this.authService.emailRegister(registerUserDto);
        this.logger.debug(`User ${registerUserDto.email} registered successfully`, 'AuthController#register');
        return result;
    }

    @Post('login/email')
    @HttpCode(HttpStatus.OK)
    async emailLogin(@Body() loginDto: EmailLoginDto)
    {
        this.logger.debug(`Login attempt for user: ${loginDto.email}`, 'AuthController#emailLogin');
        const user = await this.authService.emailLogin(loginDto.email, loginDto.password);
        this.logger.debug(`User ${loginDto.email} authenticated successfully`, 'AuthController#emailLogin');
        const tokens = await this.authService.generateTokens(user);
        this.logger.debug(`Login successful for user: ${loginDto.email}`, 'AuthController#emailLogin');
        return tokens;
    }

    @Post('refresh-token')
    @HttpCode(HttpStatus.OK)
    async refreshToken(@Body() refreshTokenDto: RefreshTokenDto)
    {
        this.logger.debug('Refresh token attempt', 'AuthController#refreshToken');
        if (!refreshTokenDto.refresh_token)
        {
            this.logger.warn('Refresh token is missing', 'AuthController#refreshToken');
            throw new UnauthorizedException('Refresh token is missing');
        }
        const result = await this.authService.refreshToken(refreshTokenDto.refresh_token);
        this.logger.debug('Token refreshed successfully', 'AuthController#refreshToken');
        return result;
    }

    // Endpoints for password reset, email verification will be added later
}
