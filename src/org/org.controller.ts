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
import { EmailVerifiedGuard } from '../auth/guards/email-verified.guard';
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
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
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
        
        if (subscription.userId.toString() !== user.id)
        {
            this.logger.error(`Subscription ${createData.subscriptionId} does not belong to user: ${user.email}`, 'OrgController#createOrganization');
            throw new SubscriptionOwnershipException(createData.subscriptionId.toString());
        }
        
        if (subscription.status !== SubscriptionStatus.ACTIVE && subscription.status !== SubscriptionStatus.TRIALING)
        {
            this.logger.error(`Subscription is not active: ${createData.subscriptionId}`, 'OrgController#createOrganization');
            throw new SubscriptionNotActiveException(createData.subscriptionId.toString());
        }
        
        // Create the organization (now also creates the owner relation atomically)
        const org = await this.orgService.create(createData, user._id as Types.ObjectId, subscription._id as Types.ObjectId);
        
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
            // Validate populated data
            if (!relation.orgId || !relation.userId) 
            {
                this.logger.warn(`Corrupted relation found: ${relation.id}`, 'OrgController#getUserOrgs');
                throw new CorruptedUserOrgRelationException(relation.id, !relation.orgId ? 'organization' : 'user');
            }
            this.logger.debug(`org: ${(relation.orgId as any)}`, 'OrgController#getUserOrgs');
            result.push(
                plainToInstance(OutUserOrgRelationDto, {
                    user: plainToInstance(OutUserPublicDto, (relation.userId as any).toObject(), { excludeExtraneousValues: true }),
                    org: plainToInstance(OutOrgPublicDto, (relation.orgId as any).toObject(), { excludeExtraneousValues: true }),
                    role: relation.orgRole,
                }, { excludeExtraneousValues: true })
            );
        }
        this.logger.debug(`Returning ${result.length} organization relationships for user`, 'OrgController#getUserOrgs');
        return result;
    }

    @Get(':id')
    @UseGuards(OrgRolesGuard, OrgSubscriptionGuard)
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER, OrgRole.STAFF)
    async getOrganization(
        @CurrentUser() user: User,
        @Param('id', ObjectIdValidationPipe) orgId: Types.ObjectId,
    ): Promise<OutOrgDto>
    {
        this.logger.debug(`Getting organization: ${orgId} by user: ${user.email}`, 'OrgController#getOrganization');
        
        const org = await this.orgService.findById(orgId);
        if (!org) 
        {
            this.logger.warn(`Organization not found: ${orgId}`, 'OrgController#getOrganization');
            throw new OrganizationNotFoundException(orgId.toString());
        }
        
        this.logger.debug(`Returning organization: ${org.name}`, 'OrgController#getOrganization');
        return plainToInstance(OutOrgDto, org.toObject(), { excludeExtraneousValues: true });
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
        
        // Verify organization exists (guards already checked access)
        const org = await this.orgService.findById(orgId);
        if (!org) 
        {
            this.logger.warn(`Organization not found: ${orgId}`, 'OrgController#getOrgMembers');
            throw new OrganizationNotFoundException(orgId.toString());
        }
        
        // Get all populated user-org relations for this organization
        const orgRelations = await this.userOrgRelationService.findAll(undefined, undefined, orgId);

        const result: OutUserOrgRelationDto[] = [];
        for (const relation of orgRelations) 
        {
            // Validate populated data
            if (!relation.userId || !relation.orgId) 
            {
                this.logger.warn(`Corrupted relation found: ${relation.id}`, 'OrgController#getOrgMembers');
                throw new CorruptedUserOrgRelationException(relation.id, !relation.userId ? 'user' : 'organization');
            }
            
            result.push(
                plainToInstance(OutUserOrgRelationDto, {
                    user: plainToInstance(OutUserPublicDto, (relation.userId as any).toObject(), { excludeExtraneousValues: true }),
                    org: plainToInstance(OutOrgPublicDto, (relation.orgId as any).toObject(), { excludeExtraneousValues: true }),
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
        
        // Get populated relation data for response
        const populatedRelations = await this.userOrgRelationService.findAll(userId, undefined, orgId);
        if (!populatedRelations.length)
        {
            this.logger.error(`Failed to get populated relation data for response`, 'OrgController#updateMemberRole');
            throw new CorruptedUserOrgRelationException(updatedRelation.id, 'organization');
        }
        
        const populatedRelation = populatedRelations[0];
        if (!populatedRelation.userId || !populatedRelation.orgId)
        {
            this.logger.error(`Populated relation missing user or org data`, 'OrgController#updateMemberRole');
            throw new CorruptedUserOrgRelationException(updatedRelation.id, !populatedRelation.userId ? 'user' : 'organization');
        }
        
        this.logger.debug(`Member role updated successfully for user: ${userId} in org: ${orgId} to role: ${updateData.role}`, 'OrgController#updateMemberRole');
        
        return plainToInstance(OutUserOrgRelationDto, {
            user: plainToInstance(OutUserPublicDto, (populatedRelation.userId as any).toObject(), { excludeExtraneousValues: true }),
            org: plainToInstance(OutOrgPublicDto, (populatedRelation.orgId as any).toObject(), { excludeExtraneousValues: true }),
            role: updatedRelation.orgRole,
        }, { excludeExtraneousValues: true });
    }

}
