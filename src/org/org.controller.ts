import {
    Controller,
    Get,
    Put,
    Query,
    UseGuards,
    Logger,
    ConflictException,
    NotFoundException,
    Param,
    Body,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/schemas/user.schema';
import { OrgService } from './org.service';
import { OrgRole } from './schemas/user-org-relation.schema';
import { UserOrgRelationService } from './user-org-relation.service';
import { OutUserOrgRelationDto } from './dto/out.user-org-relation';
import { OutOrgPublicDto } from './dto/out.org.public.dto';
import { OutOrgDto } from './dto/out.org.dto';
import { UpdateOrganizationDto } from './dto/in.update-org.dto';
import { ObjectIdValidationPipe } from '../pipes/object-id-validation.pipe';
import { plainToInstance } from 'class-transformer';
import { OutUserPublicDto } from '../user/dto/out.user.public.dto';
import { OrgRolesGuard } from './guards/org-roles.guard';
import { OrgRoles } from './decorators/org-roles.decorator';
import { UserService } from '../user/user.service';

@Controller('orgs')
@UseGuards(JwtAuthGuard)
export class OrgController
{
    private readonly logger = new Logger(OrgController.name);

    constructor(
        private readonly orgService: OrgService,
        private readonly userOrgRelationService: UserOrgRelationService,
        private readonly userService: UserService,
    ) { }

    @Get()
    async getUserOrgs(
        @CurrentUser() user: User,
        @Query('orgRole') orgRole?: OrgRole,
    ): Promise<OutUserOrgRelationDto[]>
    {
        this.logger.debug(`Getting organizations for user: ${user.email} with role filter: ${orgRole}`, 'OrgController#getUserOrgs');
        const userOrgRelations = await this.userOrgRelationService.findAll(user._id as Types.ObjectId, orgRole, undefined);
        const result: OutUserOrgRelationDto[] = [];
        for (const relation of userOrgRelations) 
        {
            const org = await this.orgService.findById(relation.orgId);
            if (!org) 
            {
                this.logger.warn(`Organization not found for relation: ${relation.id}`, 'OrgController#getUserOrgs');
                throw new ConflictException(`Organization not found for relation: ${relation.id}`);
            }
            result.push(
                plainToInstance(OutUserOrgRelationDto, {
                    user: plainToInstance(OutUserPublicDto, user.toObject()),
                    org: plainToInstance(OutOrgPublicDto, org.toObject()),
                    role: relation.orgRole,
                }, { excludeExtraneousValues: true })
            );
        }
        this.logger.debug(`Returning ${result.length} organization relationships for user`, 'OrgController#getUserOrgs');
        return result;
    }

    @Get(':id/members')
    @UseGuards(OrgRolesGuard)
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER, OrgRole.STAFF)
    async getOrgMembers(
        @CurrentUser() user: User,
        @Param('id', ObjectIdValidationPipe) orgId: Types.ObjectId,
    ): Promise<OutUserOrgRelationDto[]>
    {
        this.logger.debug(`Getting members for organization: ${orgId} by user: ${user.email}`, 'OrgController#getOrgMembers');
        
        // Get the organization details
        const org = await this.orgService.findById(orgId);
        if (!org) 
        {
            this.logger.warn(`Organization not found: ${orgId}`, 'OrgController#getOrgMembers');
            throw new NotFoundException(`Organization not found: ${orgId}`);
        }
        
        // Get all user-org relations for this organization
        const orgRelations = await this.userOrgRelationService.findAll(undefined, undefined, orgId);

        const result: OutUserOrgRelationDto[] = [];
        for (const relation of orgRelations) 
        {
            const relationUser = await this.userService.findById(relation.userId);
            if (!relationUser) 
            {
                this.logger.warn(`User not found for relation: ${relation.id}`, 'OrgController#getOrgMembers');
                throw new ConflictException(`User not found for relation: ${relation.id}`);
            }
            
            result.push(
                plainToInstance(OutUserOrgRelationDto, {
                    user: plainToInstance(OutUserPublicDto, relationUser.toObject()),
                    org: plainToInstance(OutOrgPublicDto, org.toObject()),
                    role: relation.orgRole,
                }, { excludeExtraneousValues: true })
            );
        }
        
        this.logger.debug(`Returning ${result.length} members for organization: ${orgId}`, 'OrgController#getOrgMembers');
        return result;
    }

    @Put(':id')
    @UseGuards(OrgRolesGuard)
    @OrgRoles(OrgRole.OWNER)
    async updateOrg(
        @CurrentUser() user: User,
        @Param('id', ObjectIdValidationPipe) orgId: Types.ObjectId,
        @Body() updateData: UpdateOrganizationDto,
    ): Promise<OutOrgDto>
    {
        this.logger.debug(`Updating organization: ${orgId} by user: ${user.email}`, 'OrgController#updateOrganization');
        const updatedOrg = await this.orgService.update(orgId, updateData);
        this.logger.debug(`Organization updated successfully: ${updatedOrg.name}`, 'OrgController#updateOrganization');
        return plainToInstance(OutOrgDto, updatedOrg.toObject(), { excludeExtraneousValues: true });
    }

}
