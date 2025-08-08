import {
    Controller,
    Get,
    Post,
    Param,
    NotFoundException,
} from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { plainToInstance } from 'class-transformer';
import { OutInvitationPublicDto } from './dto/out.invitation-public.dto';
import { CustomLogger } from '../common/logger/custom.logger';

/**
 * Public controller for anonymous users to interact with invitations.
 * These endpoints do not require authentication and are used for invitation
 * acceptance/decline before user registration.
 */
@Controller('public/invitations')
export class InvitationPublicController 
{
    constructor(
        private readonly orgInviteService: InvitationService,
        private readonly logger: CustomLogger,
    ) {}

    /**
     * Get invitation details by token for display to anonymous users.
     * This allows the frontend to show invitation information before requiring
     * the user to register or log in.
     * @param token - The invitation token
     * @returns Invitation details
     */
    @Get('details/:token')
    async getInvitationDetails(@Param('token') token: string): Promise<OutInvitationPublicDto> 
    {
        this.logger.debug('Getting invitation details for token', 'InvitationPublicController#getInvitationDetails');
        
        const invitation = await this.orgInviteService.getInvitationByToken(token);
        if (!invitation) 
        {
            throw new NotFoundException('Invalid or expired invitation token');
        }
        
        return plainToInstance(OutInvitationPublicDto, invitation, { excludeExtraneousValues: true });
    }

    /**
     * Accept an invitation as an anonymous user.
     * This marks the invitation as accepted but pending registration.
     * The invitation will be fully processed when the user completes registration.
     * @param token - The invitation token
     * @returns Success message
     */
    @Post('accept/:token')
    async acceptInvitationAnonymous(@Param('token') token: string): Promise<{ message: string }> 
    {
        this.logger.debug('Anonymous user accepting invitation with token', 'InvitationPublicController#acceptInvitationAnonymous');
        
        await this.orgInviteService.acceptInvitation(token);
        
        return { message: 'Invitation accepted. Please complete registration to join the organization.' };
    }

    /**
     * Decline an invitation as an anonymous user.
     * This permanently declines the invitation.
     * @param token - The invitation token
     * @returns Success message
     */
    @Post('decline/:token')
    async declineInvitationAnonymous(@Param('token') token: string): Promise<{ message: string }> 
    {
        this.logger.debug('Anonymous user declining invitation with token', 'InvitationPublicController#declineInvitationAnonymous');
        
        await this.orgInviteService.declineInvitation(token);
        
        return { message: 'Invitation declined successfully' };
    }
}
