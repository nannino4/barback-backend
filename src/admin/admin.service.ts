import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { User } from '../user/schemas/user.schema';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class AdminService
{
    private readonly logger = new Logger(AdminService.name);

    constructor(private readonly userService: UserService)
    {
        this.logger.debug('AdminService initialized', 'AdminService#constructor');
    }

    async getAllUsers(limit: number = 10, offset: number = 0): Promise<User[]>
    {
        this.logger.debug(`Admin fetching all users with limit: ${limit}, offset: ${offset}`, 'AdminService#getAllUsers');
        return this.userService.findAll(limit, offset);
    }

    async getUserById(id: string): Promise<User>
    {
        this.logger.debug(`Admin fetching user by ID: ${id}`, 'AdminService#getUserById');
        return this.userService.findById(id);
    }

    async updateUserProfile(id: string, updateData: UpdateUserProfileDto): Promise<User>
    {
        this.logger.debug(`Admin updating user profile for ID: ${id}`, 'AdminService#updateUserProfile');
        return this.userService.updateProfile(id, updateData);
    }

    async updateUserRole(id: string, updateData: UpdateUserRoleDto): Promise<User>
    {
        this.logger.debug(`Admin updating user role for ID: ${id} to role: ${updateData.role}`, 'AdminService#updateUserRole');
        return this.userService.updateRole(id, updateData.role);
    }

    async updateUserStatus(id: string, updateData: UpdateUserStatusDto): Promise<User>
    {
        this.logger.debug(`Admin updating user status for ID: ${id} to active: ${updateData.isActive}`, 'AdminService#updateUserStatus');
        return this.userService.updateStatus(id, updateData.isActive);
    }

    async deleteUser(id: string): Promise<{ message: string }>
    {
        this.logger.debug(`Admin deleting user with ID: ${id}`, 'AdminService#deleteUser');
        return this.userService.remove(id);
    }
}
