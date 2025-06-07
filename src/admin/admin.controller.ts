import {
    Controller,
    Get,
    Put,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRolesGuard } from '../auth/guards/user-roles.guard';
import { UserRoles } from '../auth/decorators/user-roles.decorator';
import { User, UserRole } from '../user/schemas/user.schema';
import { UpdateUserProfileDto } from '../user/dto/in.update-user-profile.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, UserRolesGuard)
@UserRoles(UserRole.ADMIN)
export class AdminController
{
    private readonly logger = new Logger(AdminController.name);

    constructor(private readonly userService: UserService)
    {
        this.logger.debug('AdminController initialized', 'AdminController#constructor');
    }

    @Get()
    async getAllUsers(
        @Query('limit') limit: string = '10',
        @Query('offset') offset: string = '0'
    ): Promise<User[]>
    {
        this.logger.debug(`Admin fetching all users with limit: ${limit}, offset: ${offset}`, 'AdminController#getAllUsers');
        const limitNum = parseInt(limit, 10);
        const offsetNum = parseInt(offset, 10);
        
        const users = await this.userService.findAll(limitNum, offsetNum);
        this.logger.debug(`Admin found ${users.length} users`, 'AdminController#getAllUsers');
        return users;
    }

    @Get(':id')
    async getUserById(@Param('id') id: string): Promise<User>
    {
        this.logger.debug(`Admin fetching user by ID: ${id}`, 'AdminController#getUserById');
        const user = await this.userService.findById(id);
        this.logger.debug(`Admin found user: ${user.email}`, 'AdminController#getUserById');
        return user;
    }

    @Put(':id/profile')
    async updateUserProfile(
        @Param('id') id: string,
        @Body() updateData: UpdateUserProfileDto
    ): Promise<User>
    {
        this.logger.debug(`Admin updating user profile for ID: ${id}`, 'AdminController#updateUserProfile');
        const user = await this.userService.updateProfile(id, updateData);
        this.logger.debug(`Admin updated user profile: ${user.email}`, 'AdminController#updateUserProfile');
        return user;
    }

    @Put(':id/role')
    async updateUserRole(
        @Param('id') id: string,
        @Body() updateData: UpdateUserRoleDto
    ): Promise<User>
    {
        this.logger.debug(`Admin updating user role for ID: ${id} to role: ${updateData.role}`, 'AdminController#updateUserRole');
        const user = await this.userService.updateRole(id, updateData.role);
        this.logger.debug(`Admin updated user role: ${user.email} to ${user.role}`, 'AdminController#updateUserRole');
        return user;
    }

    @Put(':id/status')
    async updateUserStatus(
        @Param('id') id: string,
        @Body() updateData: UpdateUserStatusDto
    ): Promise<User>
    {
        this.logger.debug(`Admin updating user status for ID: ${id} to active: ${updateData.isActive}`, 'AdminController#updateUserStatus');
        const user = await this.userService.updateStatus(id, updateData.isActive);
        this.logger.debug(`Admin updated user status: ${user.email} to active: ${user.isActive}`, 'AdminController#updateUserStatus');
        return user;
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async deleteUser(@Param('id') id: string)
    {
        this.logger.debug(`Admin attempting to delete user with ID: ${id}`, 'AdminController#deleteUser');
        const result = await this.userService.remove(id);
        this.logger.debug(`Admin user deletion result: ${JSON.stringify(result)}`, 'AdminController#deleteUser');
        return ;
    }
}
