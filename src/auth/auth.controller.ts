import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
// import { CreateUserDto } from '../user/dto/create-user.dto'; // For registration
// For a Login DTO if you create one for validation:
// import { LoginUserDto } from './dto/login-user.dto';

@Controller('auth')
export class AuthController
{
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @HttpCode(HttpStatus.OK) // Explicitly set OK status for successful login
    async login(@Body() loginDto: any) // TODO: Replace 'any' with a LoginUserDto
    {
        const user = await this.authService.validateUser(loginDto.email, loginDto.password);
        if (!user)
        {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user);
    }

    /*
    @Post('register')
    async register(@Body() createUserDto: CreateUserDto)
    {
        // const user = await this.authService.register(createUserDto);
        // return user; // Or a success message
        return 'Registration endpoint placeholder';
    }
    */

    // Endpoints for password reset, email verification will be added later
}
