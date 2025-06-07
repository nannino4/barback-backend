import { Controller, Get, Logger, UseGuards, Delete, HttpCode, HttpStatus, Put, Body } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateUserProfileDto } from './dto/in.update-user-profile.dto';
import { ChangePasswordDto } from './dto/in.change-password.dto';
import { UserResponseDto } from './dto/out.user-response.dto';
import { User } from './schemas/user.schema';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController
{
    private readonly logger = new Logger(UserController.name);

    constructor(private readonly userService: UserService) { }

    // User Self-Profile Management Endpoints
    
    @Get('me')
    async getCurrentUser(@CurrentUser() user: User): Promise<UserResponseDto>
    {
        this.logger.debug(`User fetching own profile: ${user.email}`, 'UserController#getCurrentUser');
        return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
    }

    @Put('me')
    async updateCurrentUserProfile(
        @CurrentUser() user: User,
        @Body() updateData: UpdateUserProfileDto
    ): Promise<UserResponseDto>
    {
        this.logger.debug(`User updating own profile: ${user.email}`, 'UserController#updateCurrentUserProfile');
        const updatedUser = await this.userService.updateProfile(user.id, updateData);
        this.logger.debug(`User profile updated successfully: ${updatedUser.email}`, 'UserController#updateCurrentUserProfile');
        return plainToInstance(UserResponseDto, updatedUser, { excludeExtraneousValues: true });
    }

    @Put('me/password')
    @HttpCode(HttpStatus.OK)
    async changeCurrentUserPassword(
        @CurrentUser() user: User,
        @Body() changePasswordDto: ChangePasswordDto
    )
    {
        this.logger.debug(`User attempting to change password: ${user.email}`, 'UserController#changeCurrentUserPassword');
        const result = await this.userService.changePassword(
            user.id,
            changePasswordDto.currentPassword,
            changePasswordDto.newPassword
        );
        this.logger.debug(`Password changed successfully for user: ${user.email}`, 'UserController#changeCurrentUserPassword');
        return result;
    }

    @Delete('me')
    @HttpCode(HttpStatus.OK)
    async deleteCurrentUser(@CurrentUser() user: User)
    {
        this.logger.debug(`User attempting to delete own account: ${user.email}`, 'UserController#deleteCurrentUser');
        const result = await this.userService.remove(user.id);
        this.logger.debug(`User account deletion result: ${JSON.stringify(result)}`, 'UserController#deleteCurrentUser');
        return result;
    }
}
