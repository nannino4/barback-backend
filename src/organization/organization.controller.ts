import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddUserToOrganizationDto } from './dto/add-user-to-organization.dto';
import { UpdateUserRoleInOrganizationDto } from './dto/update-user-role-in-organization.dto';

@Controller('organizations')
export class OrganizationController
{
    constructor(private readonly organizationService: OrganizationService) { }

    @Post()
    create(@Body() createOrganizationDto: CreateOrganizationDto)
    {
        // For now, we assume ownerId is passed in DTO.
        // Later, this would come from the authenticated user.
        return this.organizationService.create(createOrganizationDto);
    }

    @Get()
    findAll(@Query('limit') limit: number = 10, @Query('offset') offset: number = 0)
    {
        return this.organizationService.findAll(limit, offset);
    }

    @Get(':id')
    findOne(@Param('id') id: string)
    {
        return this.organizationService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto)
    {
        return this.organizationService.update(id, updateOrganizationDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string)
    {
        // Consider implications: what happens to users, data, etc.
        return this.organizationService.remove(id);
    }

    // User management within an organization
    @Post(':orgId/users')
    addUserToOrganization(
        @Param('orgId') orgId: string,
        @Body() addUserDto: AddUserToOrganizationDto,
    )
    {
        return this.organizationService.addUserToOrganization(orgId, addUserDto.userId, addUserDto.role);
    }

    @Get(':orgId/users')
    getUsersInOrganization(@Param('orgId') orgId: string)
    {
        return this.organizationService.getUsersInOrganization(orgId);
    }

    @Patch(':orgId/users/:userId')
    updateUserRoleInOrganization(
        @Param('orgId') orgId: string,
        @Param('userId') userId: string,
        @Body() updateUserRoleDto: UpdateUserRoleInOrganizationDto,
    )
    {
        return this.organizationService.updateUserRoleInOrganization(orgId, userId, updateUserRoleDto.role);
    }

    @Delete(':orgId/users/:userId')
    removeUserFromOrganization(
        @Param('orgId') orgId: string,
        @Param('userId') userId: string,
    )
    {
        return this.organizationService.removeUserFromOrganization(orgId, userId);
    }
}
