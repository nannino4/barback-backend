import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { OrgService } from './org.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { UpdateOrgDto } from './dto/update-org.dto';
import { AddUserToOrgDto } from './dto/add-user-to-org.dto';
import { UpdateUserRoleInOrgDto } from './dto/update-user-role-in-org.dto';

@Controller('organizations')
export class OrgController
{
    constructor(private readonly orgService: OrgService) { }

    @Post()
    create(@Body() createOrgDto: CreateOrgDto)
    {
        // For now, we assume ownerId is passed in DTO.
        // Later, this would come from the authenticated user.
        return this.orgService.create(createOrgDto);
    }

    @Get()
    findAll(@Query('limit') limit: number = 10, @Query('offset') offset: number = 0)
    {
        return this.orgService.findAll(limit, offset);
    }

    @Get(':id')
    findOne(@Param('id') id: string)
    {
        return this.orgService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateOrgDto: UpdateOrgDto)
    {
        return this.orgService.update(id, updateOrgDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string)
    {
        // Consider implications: what happens to users, data, etc.
        return this.orgService.remove(id);
    }

    // User management within an organization
    @Post(':orgId/users')
    addUserToOrg(
        @Param('orgId') orgId: string,
        @Body() addUserDto: AddUserToOrgDto,
    )
    {
        return this.orgService.addUserToOrg(orgId, addUserDto.userId, addUserDto.role);
    }

    @Get(':orgId/users')
    getUsersInOrg(@Param('orgId') orgId: string)
    {
        return this.orgService.getUsersInOrg(orgId);
    }

    @Patch(':orgId/users/:userId')
    updateUserRoleInOrg(
        @Param('orgId') orgId: string,
        @Param('userId') userId: string,
        @Body() updateUserRoleDto: UpdateUserRoleInOrgDto,
    )
    {
        return this.orgService.updateUserRoleInOrg(orgId, userId, updateUserRoleDto.role);
    }

    @Delete(':orgId/users/:userId')
    removeUserFromOrg(
        @Param('orgId') orgId: string,
        @Param('userId') userId: string,
    )
    {
        return this.orgService.removeUserFromOrg(orgId, userId);
    }
}
