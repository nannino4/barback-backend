import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginEmailDto } from './dto/in.login-email.dto';
import { RefreshTokenDto } from './dto/in.refresh-token.dto';
import { RegisterEmailDto } from './dto/in.register-email.dto';
import { TokensDto } from './dto/out.tokens.dto';

@Controller('auth')
export class AuthController
{
    private readonly logger = new Logger(AuthController.name);

    constructor(private readonly authService: AuthService) {}

    @Post('register/email')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() registerUserDto: RegisterEmailDto): Promise<TokensDto>
    {
        this.logger.debug(`Registration attempt for user: ${registerUserDto.email}`, 'AuthController#register');
        const tokens = await this.authService.registerEmail(registerUserDto);
        this.logger.debug(`User ${registerUserDto.email} registered successfully`, 'AuthController#register');
        return tokens;
    }

    @Post('login/email')
    @HttpCode(HttpStatus.OK)
    async emailLogin(@Body() loginDto: LoginEmailDto): Promise<TokensDto>
    {
        this.logger.debug(`Login attempt for user: ${loginDto.email}`, 'AuthController#emailLogin');
        const tokens = await this.authService.loginEmail(loginDto.email, loginDto.password);
        this.logger.debug(`User ${loginDto.email} authenticated successfully`, 'AuthController#emailLogin');
        return tokens;
    }

    @Post('refresh-token')
    @HttpCode(HttpStatus.OK)
    async validateRefreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<TokensDto>
    {
        this.logger.debug('Refresh token attempt', 'AuthController#refreshToken');
        if (!refreshTokenDto.refresh_token)
        {
            this.logger.warn('Refresh token is missing', 'AuthController#refreshToken');
            throw new UnauthorizedException('Refresh token is missing');
        }
        const tokens = await this.authService.validateRefreshToken(refreshTokenDto.refresh_token);
        this.logger.debug('Token refreshed successfully', 'AuthController#refreshToken');
        return tokens;
    }

    // Endpoints for google oauth, password reset, email verification will be added later
}
