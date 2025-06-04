import { Controller, Get, Logger, UseGuards, Param, Query, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRolesGuard } from '../auth/guards/user-roles.guard';
import { UserRoles } from '../auth/decorators/user-roles.decorator';
import { UserRole } from './schemas/user.schema';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController
{
    private readonly logger = new Logger(UserController.name);

    constructor(private readonly userService: UserService)
    {
        this.logger.debug('UserController initialized', 'UserController#constructor');
    }

    @Get()
    @UseGuards(UserRolesGuard)
    @UserRoles(UserRole.ADMIN)
    async findAll(
        @Query('limit') limit: string = '10',
        @Query('offset') offset: string = '0',
    )
    {
        this.logger.debug(`Fetching all users with limit: ${limit}, offset: ${offset}`, 'UserController#findAll');
        const limitNum = parseInt(limit, 10);
        const offsetNum = parseInt(offset, 10);
        
        const users = await this.userService.findAll(limitNum, offsetNum);
        this.logger.debug(`Found ${users.length} users`, 'UserController#findAll');
        return users;
    }

    @Get(':id')
    @UseGuards(UserRolesGuard)
    @UserRoles(UserRole.ADMIN)
    async findById(@Param('id') id: string)
    {
        this.logger.debug(`Fetching user by ID: ${id}`, 'UserController#findById');
        const user = await this.userService.findById(id);
        this.logger.debug(`User found: ${user.email}`, 'UserController#findById');
        return user;
    }

    @Delete(':id')
    @UseGuards(UserRolesGuard)
    @UserRoles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    async remove(@Param('id') id: string)
    {
        this.logger.debug(`Attempting to delete user with ID: ${id}`, 'UserController#remove');
        const result = await this.userService.remove(id);
        this.logger.debug(`User deletion result: ${JSON.stringify(result)}`, 'UserController#remove');
        return result;
    }
}
