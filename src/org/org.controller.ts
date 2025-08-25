import {
    Controller,
    Get,
    Post,
    Put,
    Query,
    UseGuards,
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
import { UpdateMemberRoleDto } from './dto/in.update-member-role.dto';
import { CreateOrgDto } from './dto/in.create-org.dto';
import { ObjectIdValidationPipe } from '../pipes/object-id-validation.pipe';
import { plainToInstance } from 'class-transformer';
import { OutUserPublicDto } from '../user/dto/out.user.public.dto';
import { OrgRolesGuard } from './guards/org-roles.guard';
import { OrgSubscriptionGuard } from './guards/org-subscription.guard';
import { OrgRoles } from './decorators/org-roles.decorator';
import { UserService } from '../user/user.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { SubscriptionStatus } from '../subscription/schemas/subscription.schema';
import { CustomLogger } from '../common/logger/custom.logger';
import { 
    OrganizationNotFoundException, 
    SubscriptionNotActiveException, 
    SubscriptionOwnershipException,
    OwnerRoleAssignmentException,
    OwnerRoleModificationException,
    CorruptedUserOrgRelationException,
} from './exceptions/org.exceptions';

@Controller('orgs')
@UseGuards(JwtAuthGuard)
export class OrgController
{
    constructor(
        private readonly orgService: OrgService,
        private readonly userOrgRelationService: UserOrgRelationService,
        private readonly userService: UserService,
        private readonly subscriptionService: SubscriptionService,
        private readonly logger: CustomLogger,
    ) { }

    @Post()
    async createOrganization(
        @CurrentUser() user: User,
        @Body() createData: CreateOrgDto,
    ): Promise<OutOrgDto>
    {
        this.logger.debug(`Creating organization: ${createData.name} for user: ${user.email} with subscription: ${createData.subscriptionId}`, 'OrgController#createOrganization');
        
        // Verify the subscription belongs to the user and is active
        const subscription = await this.subscriptionService.findById(createData.subscriptionId);
        if (!subscription)
        {
            this.logger.error(`Subscription not found: ${createData.subscriptionId}`, 'OrgController#createOrganization');
            throw new NotFoundException('Subscription not found');
        }
        
        if (subscription.userId.toString() !== (user._id as Types.ObjectId).toString())
        {
            this.logger.error(`Subscription ${createData.subscriptionId} does not belong to user: ${user.email}`, 'OrgController#createOrganization');
            throw new SubscriptionOwnershipException(createData.subscriptionId.toString());
        }
        
        if (subscription.status !== SubscriptionStatus.ACTIVE && subscription.status !== SubscriptionStatus.TRIALING)
        {
            this.logger.error(`Subscription is not active: ${createData.subscriptionId}`, 'OrgController#createOrganization');
            throw new SubscriptionNotActiveException(createData.subscriptionId.toString());
        }
        
        // Create the organization
        const org = await this.orgService.create(createData, user._id as Types.ObjectId, subscription._id as Types.ObjectId);
        
        // Create user-org relationship with OWNER role
        await this.userOrgRelationService.create(user._id as Types.ObjectId, org._id as Types.ObjectId, OrgRole.OWNER);
        
        this.logger.debug(`Organization created successfully: ${org.name} with ID: ${org._id}`, 'OrgController#createOrganization');
        
        return plainToInstance(OutOrgDto, org.toObject(), { excludeExtraneousValues: true });
    }

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
                throw new CorruptedUserOrgRelationException(relation.id, 'organization');
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
    @UseGuards(OrgRolesGuard, OrgSubscriptionGuard)
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
            throw new OrganizationNotFoundException(orgId.toString());
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
                throw new CorruptedUserOrgRelationException(relation.id, 'user');
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
    @UseGuards(OrgRolesGuard, OrgSubscriptionGuard)
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

    @Put(':id/members/:userId/role')
    @UseGuards(OrgRolesGuard, OrgSubscriptionGuard)
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER)
    async updateMemberRole(
        @CurrentUser() user: User,
        @Param('id', ObjectIdValidationPipe) orgId: Types.ObjectId,
        @Param('userId', ObjectIdValidationPipe) userId: Types.ObjectId,
        @Body() updateData: UpdateMemberRoleDto,
    ): Promise<OutUserOrgRelationDto>
    {
        this.logger.debug(`Updating member role for user: ${userId} in org: ${orgId} to role: ${updateData.role} by user: ${user.email}`, 'OrgController#updateMemberRole');
        
        // Prevent assignment of OWNER role through role updates
        if (updateData.role === OrgRole.OWNER)
        {
            this.logger.warn(`Attempt to assign OWNER role to user: ${userId} in org: ${orgId} by user: ${user.email}`, 'OrgController#updateMemberRole');
            throw new OwnerRoleAssignmentException();
        }
        
        // Verify the target user is a member of the organization
        const targetMember = await this.userOrgRelationService.findOne(userId, orgId);
        if (!targetMember)
        {
            this.logger.warn(`Target user: ${userId} not found in organization: ${orgId}`, 'OrgController#updateMemberRole');
            throw new NotFoundException('User is not a member of this organization');
        }
        
        // Prevent modification of OWNER role
        if (targetMember.orgRole === OrgRole.OWNER)
        {
            this.logger.warn(`Attempt to modify OWNER role of user: ${userId} in org: ${orgId} by user: ${user.email}`, 'OrgController#updateMemberRole');
            throw new OwnerRoleModificationException();
        }
        
        // Update the role
        const updatedRelation = await this.userOrgRelationService.updateRole(userId, orgId, updateData.role);
        
        // Get organization and user details for response
        const org = await this.orgService.findById(orgId);
        const targetUser = await this.userService.findById(userId);
        
        if (!org || !targetUser)
        {
            this.logger.error(`Failed to get organization or user data for response - org: ${!!org}, user: ${!!targetUser}`, 'OrgController#updateMemberRole');
            throw new CorruptedUserOrgRelationException('unknown', !org ? 'organization' : 'user');
        }
        
        this.logger.debug(`Member role updated successfully for user: ${userId} in org: ${orgId} to role: ${updateData.role}`, 'OrgController#updateMemberRole');
        
        return plainToInstance(OutUserOrgRelationDto, {
            user: plainToInstance(OutUserPublicDto, targetUser.toObject()),
            org: plainToInstance(OutOrgPublicDto, org.toObject()),
            role: updatedRelation.orgRole,
        }, { excludeExtraneousValues: true });
    }

}
