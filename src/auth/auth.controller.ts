import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, Logger, Get, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginEmailDto } from './dto/in.login-email.dto';
import { RefreshTokenDto } from './dto/in.refresh-token.dto';
import { RegisterEmailDto } from './dto/in.register-email.dto';
import { SendVerificationEmailDto } from './dto/in.send-verification-email.dto';
import { VerifyEmailDto } from './dto/in.verify-email.dto';
import { ForgotPasswordDto } from './dto/in.forgot-password.dto';
import { ResetPasswordDto } from './dto/in.reset-password.dto';
import { OutTokensDto } from './dto/out.tokens.dto';

@Controller('auth')
export class AuthController
{
    private readonly logger = new Logger(AuthController.name);

    constructor(private readonly authService: AuthService) {}

    @Post('register/email')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() registerUserDto: RegisterEmailDto): Promise<OutTokensDto>
    {
        this.logger.debug(`Registration attempt for user: ${registerUserDto.email}`, 'AuthController#register');
        const tokens = await this.authService.registerEmail(registerUserDto);
        this.logger.debug(`User ${registerUserDto.email} registered successfully`, 'AuthController#register');
        return tokens;
    }

    @Post('login/email')
    @HttpCode(HttpStatus.OK)
    async emailLogin(@Body() loginDto: LoginEmailDto): Promise<OutTokensDto>
    {
        this.logger.debug(`Login attempt for user: ${loginDto.email}`, 'AuthController#emailLogin');
        const tokens = await this.authService.loginEmail(loginDto.email, loginDto.password);
        this.logger.debug(`User ${loginDto.email} authenticated successfully`, 'AuthController#emailLogin');
        return tokens;
    }

    @Post('refresh-token')
    @HttpCode(HttpStatus.OK)
    async validateRefreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<OutTokensDto>
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

    @Post('send-verification-email')
    @HttpCode(HttpStatus.OK)
    async sendVerificationEmail(@Body() sendVerificationEmailDto: SendVerificationEmailDto): Promise<void>
    {
        this.logger.debug(`Sending verification email to: ${sendVerificationEmailDto.email}`, 'AuthController#sendVerificationEmail');
        await this.authService.sendVerificationEmail(sendVerificationEmailDto.email);
        this.logger.debug(`Verification email sent to: ${sendVerificationEmailDto.email}`, 'AuthController#sendVerificationEmail');
    }

    @Post('verify-email')
    @HttpCode(HttpStatus.OK)
    async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<void>
    {
        this.logger.debug('Email verification attempt', 'AuthController#verifyEmail');
        await this.authService.verifyEmail(verifyEmailDto.token);
        this.logger.debug('Email verification successful', 'AuthController#verifyEmail');
    }

    @Get('verify-email/:token')
    @HttpCode(HttpStatus.OK)
    async verifyEmailByLink(@Param('token') token: string): Promise<void>
    {
        this.logger.debug('Email verification by link attempt', 'AuthController#verifyEmailByLink');
        await this.authService.verifyEmail(token);
        this.logger.debug('Email verification by link successful', 'AuthController#verifyEmailByLink');
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<void>
    {
        this.logger.debug(`Password reset request for: ${forgotPasswordDto.email}`, 'AuthController#forgotPassword');
        await this.authService.forgotPassword(forgotPasswordDto.email);
        this.logger.debug(`Password reset request processed for: ${forgotPasswordDto.email}`, 'AuthController#forgotPassword');
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<void>
    {
        this.logger.debug('Password reset attempt', 'AuthController#resetPassword');
        await this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
        this.logger.debug('Password reset successful', 'AuthController#resetPassword');
    }

    @Get('reset-password/:token')
    @HttpCode(HttpStatus.OK)
    async validateResetToken(@Param('token') token: string): Promise<void>
    {
        this.logger.debug('Validating password reset token', 'AuthController#validateResetToken');
        const user = await this.authService['userService'].findByPasswordResetToken(token);
        if (!user)
        {
            this.logger.warn('Invalid password reset token', 'AuthController#validateResetToken');
            throw new UnauthorizedException('Invalid or expired reset token');
        }
        this.logger.debug('Password reset token is valid', 'AuthController#validateResetToken');
    }

    // Endpoints for google oauth will be added later
}
