import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    UseGuards,
    NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRolesGuard } from '../org/guards/org-roles.guard';
import { OrgSubscriptionGuard } from '../org/guards/org-subscription.guard';
import { OrgRoles } from '../org/decorators/org-roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InvitationService } from './invitation.service';
import { OrgService } from '../org/org.service';
import { InCreateInvitationDto } from './dto/in.create-invitation.dto';
import { OutInvitationDto } from './dto/out.invitation.dto';
import { OrgRole } from '../org/schemas/user-org-relation.schema';
import { ObjectIdValidationPipe } from '../pipes/object-id-validation.pipe';
import { User } from '../user/schemas/user.schema';
import { plainToInstance } from 'class-transformer';
import { Types } from 'mongoose';
import { CustomLogger } from '../common/logger/custom.logger';

/**
 * Controller for organization owners and managers to manage invitations.
 * Provides endpoints for sending, viewing, and revoking organization invitations.
 * All endpoints require authentication and appropriate organization roles.
 */
@Controller()
@UseGuards(JwtAuthGuard, OrgRolesGuard)
export class InvitationController 
{
    constructor(
        private readonly invitationService: InvitationService,
        private readonly orgService: OrgService,
        private readonly logger: CustomLogger,
    ) {}

    /**
     * Send a new invitation to join the organization.
     * Only organization owners and managers can send invitations.
     * @param orgId - The organization ID
     * @param createInviteDto - Invitation details (email and role)
     * @param user - The authenticated user sending the invitation
     * @returns The created invitation
     */
    @Post('orgs/:orgId/invitations')
    @UseGuards(OrgSubscriptionGuard)
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER)
    async sendInvitation(
        @Param('orgId', ObjectIdValidationPipe) orgId: Types.ObjectId,
        @Body() createInviteDto: InCreateInvitationDto,
        @CurrentUser() user: User,
    ): Promise<OutInvitationDto> 
    {
        this.logger.debug(
            `User ${user._id} sending invitation to ${createInviteDto.invitedEmail} for org ${orgId}`,
            'InvitationController#sendInvitation',
        );

        // Get organization name for the email
        const organization = await this.orgService.findById(orgId);
        if (!organization) 
        {
            throw new NotFoundException('Organization not found');
        }
        
        const invitation = await this.invitationService.createInvitation(
            orgId,
            user._id as Types.ObjectId,
            createInviteDto,
            organization.name,
        );
        this.logger.debug(
            `Invitation ${(invitation._id as Types.ObjectId).toString()} created (status=${invitation.status}) for email=${invitation.invitedEmail}`,
            'InvitationController#sendInvitation',
        );
        return plainToInstance(OutInvitationDto, invitation, { excludeExtraneousValues: true });
    }

    /**
     * Get all pending invitations for the organization.
     * Only organization owners and managers can view invitations.
     * @param orgId - The organization ID
     * @returns List of pending invitations for the organization
     */
    @Get('orgs/:orgId/invitations')
    @UseGuards(OrgSubscriptionGuard)
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER)
    async getOrganizationInvitations(
        @Param('orgId', ObjectIdValidationPipe) orgId: Types.ObjectId,
    ): Promise<OutInvitationDto[]> 
    {
        this.logger.debug(`Getting invitations for organization ${orgId}`, 'InvitationController#getOrganizationInvitations');
        
        const invitations = await this.invitationService.findPendingInvitationsByOrg(orgId);
        this.logger.debug(
            `Found ${invitations.length} pending invitations for orgId=${orgId.toString()}`,
            'InvitationController#getOrganizationInvitations',
        );
        return plainToInstance(OutInvitationDto, invitations, { excludeExtraneousValues: true });
    }

    /**
     * Revoke a pending invitation.
     * Only organization owners and managers can revoke invitations.
     * @param orgId - The organization ID
     * @param invitationId - The invitation ID to revoke
     * @returns Success message
     */
    @Delete('orgs/:orgId/invitations/:invitationId')
    @UseGuards(OrgSubscriptionGuard)
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER)
    async revokeInvitation(
        @Param('orgId', ObjectIdValidationPipe) orgId: Types.ObjectId,
        @Param('invitationId', ObjectIdValidationPipe) invitationId: Types.ObjectId,
    ): Promise<OutInvitationDto> 
    {
        this.logger.debug(
            `Revoking invitation ${invitationId} for organization ${orgId}`,
            'InvitationController#revokeInvitation',
        );
        
        const invitation = await this.invitationService.revokeInvitation(invitationId, orgId);
        this.logger.debug(
            `Invitation ${(invitation._id as Types.ObjectId).toString()} revoked (status=${invitation.status})`,
            'InvitationController#revokeInvitation',
        );
        return plainToInstance(OutInvitationDto, invitation, { excludeExtraneousValues: true });
    }

    /**
     * Get all pending invitations for the current user.
     * @param user - The authenticated user
     * @returns List of pending invitations for the user
     */
    @Get('invites')
    async getUserPendingInvitations(@CurrentUser() user: User): Promise<OutInvitationDto[]> 
    {
        this.logger.debug(`Getting pending invitations for user ${user._id}`, 'InvitationController#getUserPendingInvitations');
        
        const invitations = await this.invitationService.findPendingInvitationsByEmail(user.email);
        this.logger.debug(
            `Found ${invitations.length} pending invitations for userId=${(user._id as Types.ObjectId).toString()}`,
            'InvitationController#getUserPendingInvitations',
        );
        return plainToInstance(OutInvitationDto, invitations, { excludeExtraneousValues: true });
    }

    /**
     * Accept an invitation as an authenticated user.
     * @param invitationId - The invitation id
     * @param user - The authenticated user
     * @returns Success message
     */
    @Post('invites/:invitationId/accept')
    async acceptInvitation(
        @Param('invitationId', ObjectIdValidationPipe) invitationId: Types.ObjectId,
        @CurrentUser() user: User,
    ): Promise<OutInvitationDto> 
    {
        this.logger.debug(`User ${user._id} accepting invitation ${invitationId}`, 'InvitationController#acceptInvitation');
        
        const invitation = await this.invitationService.acceptInvitation(invitationId, user._id as Types.ObjectId);
        this.logger.debug(
            `Invitation ${(invitation._id as Types.ObjectId).toString()} accepted (status=${invitation.status}) by user ${(user._id as Types.ObjectId).toString()}`,
            'InvitationController#acceptInvitation',
        );
        return plainToInstance(OutInvitationDto, invitation, { excludeExtraneousValues: true });
    }

    /**
     * Decline an invitation as an authenticated user.
     * @param invitationId - The invitation id
     * @returns Success message
     */
    @Post('invites/:invitationId/decline')
    async declineInvitation(@Param('invitationId', ObjectIdValidationPipe) invitationId: Types.ObjectId): Promise<OutInvitationDto> 
    {
        this.logger.debug(`Declining invitation ${invitationId}`, 'InvitationController#declineInvitation');
        
        const invitation = await this.invitationService.declineInvitation(invitationId);
        this.logger.debug(
            `Invitation ${(invitation._id as Types.ObjectId).toString()} declined (status=${invitation.status})`,
            'InvitationController#declineInvitation',
        );
        return plainToInstance(OutInvitationDto, invitation, { excludeExtraneousValues: true });
    }
}
