import { Injectable, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Organization } from './schemas/organization.schema';
import { UserOrgRelationship, OrgRole, RelationshipStatus } from './schemas/user-org-relationship.schema';
import { CreateOrganizationDto } from './dto/in.create-organization.dto';
import { UpdateOrganizationDto } from './dto/in.update-organization.dto';

@Injectable()
export class OrganizationService 
{
    private readonly logger = new Logger(OrganizationService.name);

    constructor(
        @InjectModel(Organization.name) private readonly organizationModel: Model<Organization>,
        @InjectModel(UserOrgRelationship.name) private readonly relationshipModel: Model<UserOrgRelationship>,
    ) {}

    /**
     * Create a new organization with the user as owner
     */
    async create(createData: CreateOrganizationDto, ownerId: string, subscriptionId: string): Promise<Organization> 
    {
        this.logger.debug(`Creating organization: ${createData.name} for user: ${ownerId}`, 'OrganizationService#create');

        // Create organization
        const organization = new this.organizationModel({
            name: createData.name,
            ownerId: new Types.ObjectId(ownerId),
            subscriptionId: new Types.ObjectId(subscriptionId),
            settings: createData.settings || { defaultCurrency: 'EUR' },
        });

        const savedOrganization = await organization.save();

        // Create owner relationship
        const ownerRelationship = new this.relationshipModel({
            userId: new Types.ObjectId(ownerId),
            organizationId: savedOrganization._id,
            role: OrgRole.OWNER,
            status: RelationshipStatus.ACTIVE,
        });

        await ownerRelationship.save();

        this.logger.debug(`Organization created successfully: ${savedOrganization.name}`, 'OrganizationService#create');
        return savedOrganization;
    }

    /**
     * Get organizations owned by a user
     */
    async getOwnedOrganizations(userId: string): Promise<Organization[]> 
    {
        this.logger.debug(`Fetching owned organizations for user: ${userId}`, 'OrganizationService#getOwnedOrganizations');

        const organizations = await this.organizationModel
            .find({ ownerId: new Types.ObjectId(userId) })
            .exec();

        this.logger.debug(`Found ${organizations.length} owned organizations for user: ${userId}`, 'OrganizationService#getOwnedOrganizations');
        return organizations;
    }

    /**
     * Get organizations where user is a member (including owned)
     */
    async getUserOrganizations(userId: string): Promise<Organization[]> 
    {
        this.logger.debug(`Fetching member organizations for user: ${userId}`, 'OrganizationService#getUserOrganizations');

        // Find all active relationships for this user
        const relationships = await this.relationshipModel
            .find({ 
                userId: new Types.ObjectId(userId),
                status: RelationshipStatus.ACTIVE,
            })
            .populate('organizationId')
            .exec();

        const organizations = relationships
            .map(rel => rel.organizationId as unknown as Organization)
            .filter(org => org); // Filter out any null/undefined organizations

        this.logger.debug(`Found ${organizations.length} member organizations for user: ${userId}`, 'OrganizationService#getUserOrganizations');
        return organizations;
    }

    /**
     * Get members of an organization
     */
    async getOrganizationMembers(organizationId: string): Promise<UserOrgRelationship[]> 
    {
        this.logger.debug(`Fetching members for organization: ${organizationId}`, 'OrganizationService#getOrganizationMembers');

        const members = await this.relationshipModel
            .find({ 
                organizationId: new Types.ObjectId(organizationId),
                status: RelationshipStatus.ACTIVE,
            })
            .populate('userId', 'email firstName lastName')
            .exec();

        this.logger.debug(`Found ${members.length} members for organization: ${organizationId}`, 'OrganizationService#getOrganizationMembers');
        return members;
    }

    /**
     * Get user's invitations
     */
    async getUserInvitations(userEmail: string): Promise<UserOrgRelationship[]> 
    {
        this.logger.debug(`Fetching invitations for user: ${userEmail}`, 'OrganizationService#getUserInvitations');

        const invitations = await this.relationshipModel
            .find({ 
                invitedEmail: userEmail,
                status: RelationshipStatus.PENDING,
                invitationExpires: { $gt: new Date() }, // Only non-expired invitations
            })
            .populate('organizationId', 'name')
            .populate('invitedBy', 'email firstName lastName')
            .exec();

        this.logger.debug(`Found ${invitations.length} invitations for user: ${userEmail}`, 'OrganizationService#getUserInvitations');
        return invitations;
    }

    /**
     * Update organization details (owner only)
     */
    async updateOrganization(organizationId: string, updateData: UpdateOrganizationDto, requestingUserId: string): Promise<Organization> 
    {
        this.logger.debug(`Updating organization: ${organizationId} by user: ${requestingUserId}`, 'OrganizationService#updateOrganization');

        // Check if organization exists
        const organization = await this.organizationModel.findById(organizationId).exec();
        if (!organization) 
        {
            this.logger.warn(`Organization not found: ${organizationId}`, 'OrganizationService#updateOrganization');
            throw new NotFoundException('Organization not found');
        }

        // Check if user is the owner
        if (organization.ownerId.toString() !== requestingUserId) 
        {
            this.logger.warn(`User ${requestingUserId} is not the owner of organization ${organizationId}`, 'OrganizationService#updateOrganization');
            throw new ForbiddenException('Only the organization owner can update organization details');
        }

        // Update organization
        const updatedOrganization = await this.organizationModel
            .findByIdAndUpdate(organizationId, updateData, { new: true })
            .exec();

        this.logger.debug(`Organization updated successfully: ${updatedOrganization!.name}`, 'OrganizationService#updateOrganization');
        return updatedOrganization!;
    }

    /**
     * Update member role (owners and managers only, no one can become owner)
     */
    async updateMemberRole(organizationId: string, targetUserId: string, newRole: OrgRole, requestingUserId: string): Promise<UserOrgRelationship> 
    {
        this.logger.debug(`Updating member role in organization: ${organizationId}, target: ${targetUserId}, new role: ${newRole}, requester: ${requestingUserId}`, 'OrganizationService#updateMemberRole');

        // Prevent making someone an owner
        if (newRole === OrgRole.OWNER) 
        {
            this.logger.warn(`Attempt to assign owner role to user ${targetUserId} in organization ${organizationId}`, 'OrganizationService#updateMemberRole');
            throw new ForbiddenException('Cannot assign owner role. Transfer ownership is not supported through role updates');
        }

        // Check if requesting user has permission (owner or manager)
        const requestingUserRole = await this.getUserRoleInOrganization(requestingUserId, organizationId);
        if (!requestingUserRole || (requestingUserRole !== OrgRole.OWNER && requestingUserRole !== OrgRole.MANAGER)) 
        {
            this.logger.warn(`User ${requestingUserId} does not have permission to update roles in organization ${organizationId}`, 'OrganizationService#updateMemberRole');
            throw new ForbiddenException('Only owners and managers can update member roles');
        }

        // Prevent managers from modifying owner or other managers (only owners can do that)
        if (requestingUserRole === OrgRole.MANAGER) 
        {
            const targetUserRole = await this.getUserRoleInOrganization(targetUserId, organizationId);
            if (targetUserRole === OrgRole.OWNER || targetUserRole === OrgRole.MANAGER) 
            {
                this.logger.warn(`Manager ${requestingUserId} attempted to modify role of ${targetUserRole} ${targetUserId}`, 'OrganizationService#updateMemberRole');
                throw new ForbiddenException('Managers cannot modify owner or other manager roles');
            }
        }

        // Update the relationship
        const updatedRelationship = await this.relationshipModel
            .findOneAndUpdate(
                { 
                    userId: new Types.ObjectId(targetUserId),
                    organizationId: new Types.ObjectId(organizationId),
                    status: RelationshipStatus.ACTIVE,
                },
                { role: newRole },
                { new: true }
            )
            .populate('userId', 'email firstName lastName')
            .exec();

        if (!updatedRelationship) 
        {
            this.logger.warn(`Member relationship not found for user ${targetUserId} in organization ${organizationId}`, 'OrganizationService#updateMemberRole');
            throw new NotFoundException('Member not found in organization');
        }

        this.logger.debug(`Member role updated successfully: ${targetUserId} -> ${newRole}`, 'OrganizationService#updateMemberRole');
        return updatedRelationship;
    }

    /**
     * Get user's role in a specific organization
     */
    async getUserRoleInOrganization(userId: string, organizationId: string): Promise<OrgRole | null> 
    {
        this.logger.debug(`Checking role for user: ${userId} in organization: ${organizationId}`, 'OrganizationService#getUserRoleInOrganization');

        const relationship = await this.relationshipModel
            .findOne({ 
                userId: new Types.ObjectId(userId),
                organizationId: new Types.ObjectId(organizationId),
                status: RelationshipStatus.ACTIVE,
            })
            .exec();

        const role = relationship?.role || null;
        this.logger.debug(`User ${userId} has role ${role} in organization ${organizationId}`, 'OrganizationService#getUserRoleInOrganization');
        return role;
    }

    /**
     * Check if user is a member of organization
     */
    async isUserMemberOfOrganization(userId: string, organizationId: string): Promise<boolean> 
    {
        const role = await this.getUserRoleInOrganization(userId, organizationId);
        return role !== null;
    }

    /**
     * Find organization by ID
     */
    async findById(organizationId: string): Promise<Organization> 
    {
        this.logger.debug(`Finding organization by ID: ${organizationId}`, 'OrganizationService#findById');

        const organization = await this.organizationModel.findById(organizationId).exec();
        if (!organization) 
        {
            this.logger.warn(`Organization not found: ${organizationId}`, 'OrganizationService#findById');
            throw new NotFoundException('Organization not found');
        }

        return organization;
    }
}
