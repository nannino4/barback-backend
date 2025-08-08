import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { Invitation, InvitationStatus } from './schemas/invitation.schema';
import { UserOrgRelation, OrgRole } from '../org/schemas/user-org-relation.schema';
import { UserService } from '../user/user.service';
import { EmailService } from '../email/email.service';
import { InCreateInvitationDto } from './dto/in.create-invitation.dto';
import { CustomLogger } from '../common/logger/custom.logger';
import { DatabaseOperationException } from '../common/exceptions/database.exceptions';
import { 
    InvitationNotFoundException,
    InvalidInvitationTokenException,
    InvitationAlreadyExistsException,
    UserAlreadyMemberException,
    CannotInviteAsOwnerException,
    InvitationEmailFailedException,
} from './exceptions/invitation.exceptions';

@Injectable()
export class InvitationService 
{
    constructor(
        @InjectModel(Invitation.name) private readonly invitationModel: Model<Invitation>,
        @InjectModel(UserOrgRelation.name) private readonly userOrgRelationModel: Model<UserOrgRelation>,
        private readonly userService: UserService,
        private readonly emailService: EmailService,
        private readonly logger: CustomLogger,
    ) {}

    async createInvitation(
        orgId: Types.ObjectId,
        invitedBy: Types.ObjectId,
        createInviteDto: InCreateInvitationDto,
        organizationName: string,
    ): Promise<Invitation> 
    {
        const { invitedEmail, role } = createInviteDto;

        // Prevent inviting owners through this system
        if (role === OrgRole.OWNER) 
        {
            throw new CannotInviteAsOwnerException();
        }

        try 
        {
            // Check if user is already a member of the organization
            const existingUser = await this.userService.findByEmail(invitedEmail);
            if (existingUser) 
            {
                const existingRelation = await this.userOrgRelationModel.findOne({
                    userId: existingUser._id,
                    orgId: orgId,
                });

                if (existingRelation) 
                {
                    throw new UserAlreadyMemberException(invitedEmail);
                }
            }

            // Check for existing pending invitation
            const existingInvite = await this.invitationModel.findOne({
                orgId: orgId,
                invitedEmail: invitedEmail,
                status: InvitationStatus.PENDING,
            });

            if (existingInvite) 
            {
                throw new InvitationAlreadyExistsException(invitedEmail);
            }

            // Generate invitation token and expiration
            const invitationToken = this.generateInvitationToken();
            const invitationExpires = new Date();
            invitationExpires.setDate(invitationExpires.getDate() + 7); // 7 days expiration

            // Create the invitation
            const invitation = new this.invitationModel({
                orgId,
                invitedEmail,
                role,
                status: InvitationStatus.PENDING,
                invitationToken,
                invitationExpires,
                invitedBy,
            });

            await invitation.save();

            // Send invitation email
            try 
            {
                const emailOptions = this.emailService.generateOrganizationInvitationEmail(
                    invitedEmail,
                    invitationToken,
                    organizationName,
                    role,
                );
                await this.emailService.sendEmail(emailOptions);
                this.logger.debug(
                    `Invitation email sent to ${invitedEmail} for organization ${organizationName}`,
                    'InvitationService#createInvitation',
                );
            } 
            catch (error) 
            {
                this.logger.error(
                    `Failed to send invitation email to ${invitedEmail}`,
                    error instanceof Error ? error.stack : undefined,
                    'InvitationService#createInvitation',
                );
                // Delete the invitation if email failed
                await this.invitationModel.deleteOne({ _id: invitation._id });
                const errorDetails = error instanceof Error ? error.message : 'Unknown error';
                throw new InvitationEmailFailedException(invitedEmail, errorDetails);
            }

            return invitation;
        }
        catch (error)
        {
            // Re-throw known exceptions
            if (error instanceof UserAlreadyMemberException ||
                error instanceof InvitationAlreadyExistsException ||
                error instanceof CannotInviteAsOwnerException ||
                error instanceof InvitationEmailFailedException) 
            {
                throw error;
            }
            
            // Handle database errors
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
                `Database error during invitation creation for ${invitedEmail}`,
                errorStack,
                'InvitationService#createInvitation',
            );
            throw new DatabaseOperationException('invitation creation', errorMessage);
        }
    }

    async findPendingInvitationsByEmail(email: string): Promise<Invitation[]> 
    {
        try 
        {
            return this.invitationModel
                .find({
                    invitedEmail: email,
                    status: InvitationStatus.PENDING,
                    invitationExpires: { $gt: new Date() },
                })
                .populate('orgId', 'name')
                .exec();
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
                `Database error while finding invitations for email ${email}`,
                errorStack,
                'InvitationService#findPendingInvitationsByEmail',
            );
            throw new DatabaseOperationException('invitation lookup by email', errorMessage);
        }
    }

    async findPendingInvitationsByOrg(orgId: Types.ObjectId): Promise<Invitation[]> 
    {
        try 
        {
            return this.invitationModel
                .find({
                    orgId,
                    status: { $in: [InvitationStatus.PENDING] },
                })
                .sort({ createdAt: -1 })
                .exec();
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
                `Database error while finding invitations for organization ${orgId}`,
                errorStack,
                'InvitationService#findPendingInvitationsByOrg',
            );
            throw new DatabaseOperationException('invitation lookup by organization', errorMessage);
        }
    }

    async acceptInvitation(token: string, userId?: Types.ObjectId): Promise<void> 
    {
        try 
        {
            const invitation = await this.invitationModel.findOne({
                invitationToken: token,
                status: InvitationStatus.PENDING,
                invitationExpires: { $gt: new Date() },
            });

            if (!invitation) 
            {
                throw new InvalidInvitationTokenException();
            }

            if (userId) 
            {
                // User is logged in - complete the invitation immediately
                await this.completeInvitationAcceptance(invitation, userId);
            } 
            else 
            {
                // User needs to register first - mark as accepted pending registration
                invitation.status = InvitationStatus.ACCEPTED_PENDING_REGISTRATION;
                await invitation.save();
            }
        }
        catch (error)
        {
            // Re-throw known exceptions
            if (error instanceof InvalidInvitationTokenException) 
            {
                throw error;
            }
            
            // Handle database errors
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
                `Database error during invitation acceptance with token`,
                errorStack,
                'InvitationService#acceptInvitation',
            );
            throw new DatabaseOperationException('invitation acceptance', errorMessage);
        }
    }

    async declineInvitation(token: string): Promise<void> 
    {
        try 
        {
            const invitation = await this.invitationModel.findOne({
                invitationToken: token,
                status: InvitationStatus.PENDING,
                invitationExpires: { $gt: new Date() },
            });

            if (!invitation) 
            {
                throw new InvalidInvitationTokenException();
            }

            invitation.status = InvitationStatus.DECLINED;
            await invitation.save();

            this.logger.debug(
                `Invitation declined for email ${invitation.invitedEmail}`,
                'InvitationService#declineInvitation',
            );
        }
        catch (error)
        {
            // Re-throw known exceptions
            if (error instanceof InvalidInvitationTokenException) 
            {
                throw error;
            }
            
            // Handle database errors
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
                `Database error during invitation decline with token`,
                errorStack,
                'InvitationService#declineInvitation',
            );
            throw new DatabaseOperationException('invitation decline', errorMessage);
        }
    }

    async revokeInvitation(invitationId: string, orgId: Types.ObjectId): Promise<void> 
    {
        try 
        {
            const invitation = await this.invitationModel.findOne({
                _id: invitationId,
                orgId,
                status: InvitationStatus.PENDING,
            });

            if (!invitation) 
            {
                throw new InvitationNotFoundException(invitationId);
            }

            invitation.status = InvitationStatus.REVOKED;
            await invitation.save();

            this.logger.debug(
                `Invitation revoked for email ${invitation.invitedEmail}`,
                'InvitationService#revokeInvitation',
            );
        }
        catch (error)
        {
            // Re-throw known exceptions
            if (error instanceof InvitationNotFoundException) 
            {
                throw error;
            }
            
            // Handle database errors
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
                `Database error during invitation revocation for ID ${invitationId}`,
                errorStack,
                'InvitationService#revokeInvitation',
            );
            throw new DatabaseOperationException('invitation revocation', errorMessage);
        }
    }

    async processPendingInvitationsForUser(userId: Types.ObjectId, email: string): Promise<void> 
    {
        const pendingInvitations = await this.invitationModel.find({
            invitedEmail: email,
            status: InvitationStatus.ACCEPTED_PENDING_REGISTRATION,
        });

        for (const invitation of pendingInvitations) 
        {
            await this.completeInvitationAcceptance(invitation, userId);
        }

        this.logger.debug(
            `Processed ${pendingInvitations.length} pending invitations for user ${userId}`,
            'InvitationService#processPendingInvitationsForUser',
        );
    }

    async getInvitationByToken(token: string): Promise<Invitation | null> 
    {
        try 
        {
            return this.invitationModel
                .findOne({
                    invitationToken: token,
                    status: InvitationStatus.PENDING,
                    invitationExpires: { $gt: new Date() },
                })
                .populate('orgId', 'name')
                .exec();
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
                `Database error while finding invitation by token`,
                errorStack,
                'InvitationService#getInvitationByToken',
            );
            throw new DatabaseOperationException('invitation lookup by token', errorMessage);
        }
    }

    private async completeInvitationAcceptance(invitation: Invitation, userId: Types.ObjectId): Promise<void> 
    {
        try 
        {
            // Check if user is already a member
            const existingRelation = await this.userOrgRelationModel.findOne({
                userId,
                orgId: invitation.orgId,
            });

            if (existingRelation) 
            {
                // User is already a member, just mark invitation as accepted
                invitation.status = InvitationStatus.ACCEPTED;
                await invitation.save();
                return;
            }

            // Create the organization relationship
            const userOrgRelation = new this.userOrgRelationModel({
                userId,
                orgId: invitation.orgId,
                role: invitation.role,
            });

            await userOrgRelation.save();

            // Mark invitation as accepted
            invitation.status = InvitationStatus.ACCEPTED;
            await invitation.save();

            this.logger.debug(
                `User ${userId} added to organization ${invitation.orgId} with role ${invitation.role}`,
                'InvitationService#completeInvitationAcceptance',
            );
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
                `Database error during invitation completion for user ${userId}`,
                errorStack,
                'InvitationService#completeInvitationAcceptance',
            );
            throw new DatabaseOperationException('invitation completion', errorMessage);
        }
    }

    private generateInvitationToken(): string 
    {
        return randomBytes(32).toString('hex');
    }
}
