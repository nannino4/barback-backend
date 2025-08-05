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
import { OutInvitationPublicDto } from './dto/out.invitation-public.dto';
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
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER)
    async sendInvitation(
        @Param('orgId', ObjectIdValidationPipe) orgId: string,
        @Body() createInviteDto: InCreateInvitationDto,
        @CurrentUser() user: User,
    ): Promise<OutInvitationDto> 
    {
        this.logger.debug(
            `User ${user._id} sending invitation to ${createInviteDto.invitedEmail} for org ${orgId}`,
            'InvitationController#sendInvitation',
        );

        // Get organization name for the email
        const organization = await this.orgService.findById(new Types.ObjectId(orgId));
        if (!organization) 
        {
            throw new NotFoundException('Organization not found');
        }
        
        const invitation = await this.invitationService.createInvitation(
            new Types.ObjectId(orgId),
            user._id as Types.ObjectId,
            createInviteDto,
            organization.name,
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
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER)
    async getOrganizationInvitations(
        @Param('orgId', ObjectIdValidationPipe) orgId: string,
    ): Promise<OutInvitationDto[]> 
    {
        this.logger.debug(`Getting invitations for organization ${orgId}`, 'InvitationController#getOrganizationInvitations');
        
        const invitations = await this.invitationService.findPendingInvitationsByOrg(new Types.ObjectId(orgId));
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
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER)
    async revokeInvitation(
        @Param('orgId', ObjectIdValidationPipe) orgId: string,
        @Param('invitationId', ObjectIdValidationPipe) invitationId: string,
    ): Promise<{ message: string }> 
    {
        this.logger.debug(
            `Revoking invitation ${invitationId} for organization ${orgId}`,
            'InvitationController#revokeInvitation',
        );
        
        await this.invitationService.revokeInvitation(invitationId, new Types.ObjectId(orgId));
        
        return { message: 'Invitation revoked successfully' };
    }

    /**
     * Get all pending invitations for the current user.
     * @param user - The authenticated user
     * @returns List of pending invitations for the user
     */
    @Get('invites')
    async getUserPendingInvitations(@CurrentUser() user: User): Promise<OutInvitationPublicDto[]> 
    {
        this.logger.debug(`Getting pending invitations for user ${user._id}`, 'InvitationController#getUserPendingInvitations');
        
        const invitations = await this.invitationService.findPendingInvitationsByEmail(user.email);
        return plainToInstance(OutInvitationPublicDto, invitations, { excludeExtraneousValues: true });
    }

    /**
     * Accept an invitation as an authenticated user.
     * @param token - The invitation token
     * @param user - The authenticated user
     * @returns Success message
     */
    @Post('invites/accept/:token')
    async acceptInvitation(
        @Param('token') token: string,
        @CurrentUser() user: User,
    ): Promise<{ message: string }> 
    {
        this.logger.debug(`User ${user._id} accepting invitation with token`, 'InvitationController#acceptInvitation');
        
        await this.invitationService.acceptInvitation(token, user._id as Types.ObjectId);
        
        return { message: 'Invitation accepted successfully' };
    }

    /**
     * Decline an invitation as an authenticated user.
     * @param token - The invitation token
     * @returns Success message
     */
    @Post('invites/decline/:token')
    async declineInvitation(@Param('token') token: string): Promise<{ message: string }> 
    {
        this.logger.debug('Declining invitation with token', 'InvitationController#declineInvitation');
        
        await this.invitationService.declineInvitation(token);
        
        return { message: 'Invitation declined successfully' };
    }
}
