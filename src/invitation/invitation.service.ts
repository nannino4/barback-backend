import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invitation, InvitationStatus } from './schemas/invitation.schema';
import { UserOrgRelation, OrgRole } from '../org/schemas/user-org-relation.schema';
import { UserService } from '../user/user.service';
import { EmailService } from '../email/email.service';
import { InCreateInvitationDto } from './dto/in.create-invitation.dto';
import { CustomLogger } from '../common/logger/custom.logger';
import { DatabaseOperationException } from '../common/exceptions/database.exceptions';
import { 
    InvitationNotFoundException,
    InvalidInvitationException,
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
        this.logger.debug(
            `Creating invitation for email=${createInviteDto.invitedEmail} orgId=${orgId} role=${createInviteDto.role}`,
            'InvitationService#createInvitation',
        );
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

            // Generate expiration timestamp
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

            // Create the invitation
            const invitation = new this.invitationModel({
                orgId,
                invitedEmail,
                role,
                status: InvitationStatus.PENDING,
                expiresAt,
                invitedBy,
            });

            await invitation.save();

            // Send invitation email
            try 
            {
                const emailOptions = this.emailService.generateOrganizationInvitationEmail(
                    invitedEmail,
                    invitation.id,
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

            this.logger.debug(
                `Invitation ${invitation.id} created successfully for email=${invitedEmail}`,
                'InvitationService#createInvitation',
            );
            
            // Populate before returning
            await invitation.populate('orgId', 'id name');
            await invitation.populate('invitedBy', 'id firstName lastName email profilePictureUrl');
            
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
            this.logger.debug(`Finding pending invitations by email=${email}`, 'InvitationService#findPendingInvitationsByEmail');
            return this.invitationModel
                .find({
                    invitedEmail: email,
                    status: InvitationStatus.PENDING,
                    expiresAt: { $gt: new Date() },
                })
                .populate('orgId', 'id name')
                .populate('invitedBy', 'id firstName lastName email profilePictureUrl')
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
            this.logger.debug(`Finding pending invitations for orgId=${orgId}`, 'InvitationService#findPendingInvitationsByOrg');
            return this.invitationModel
                .find({
                    orgId,
                    status: { $in: [InvitationStatus.PENDING] },
                })
                .populate('orgId', 'id name')
                .populate('invitedBy', 'id firstName lastName email profilePictureUrl')
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

    async acceptInvitation(invitationId: Types.ObjectId, userId: Types.ObjectId): Promise<Invitation> 
    {
        try 
        {
            this.logger.debug(
                `Accepting invitation invitationId=${invitationId} userId=${userId}`,
                'InvitationService#acceptInvitation',
            );
            const invitation = await this.invitationModel.findOne({
                _id: invitationId,
                status: InvitationStatus.PENDING,
                expiresAt: { $gt: new Date() },
            });

            if (!invitation) 
            {
                throw new InvalidInvitationException();
            }
            // Check if user already a member
            const existingRelation = await this.userOrgRelationModel.findOne({
                userId,
                orgId: invitation.orgId,
            });
            if (!existingRelation)
            {
                const userOrgRelation = new this.userOrgRelationModel({
                    userId,
                    orgId: invitation.orgId,
                    role: invitation.role,
                });
                await userOrgRelation.save();
            }
            invitation.status = InvitationStatus.ACCEPTED;
            await invitation.save();
            this.logger.debug(
                `Invitation ${invitation.id} accepted by userId=${userId}`,
                'InvitationService#acceptInvitation',
            );
            
            // Populate before returning
            await invitation.populate('orgId', 'id name');
            await invitation.populate('invitedBy', 'id firstName lastName email profilePictureUrl');
            
            return invitation;
        }
        catch (error)
        {
            // Re-throw known exceptions
            if (error instanceof InvalidInvitationException) 
            {
                throw error;
            }
            
            // Handle database errors
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
                `Database error during invitation acceptance by id`,
                errorStack,
                'InvitationService#acceptInvitation',
            );
            throw new DatabaseOperationException('invitation acceptance', errorMessage);
        }
    }

    async declineInvitation(invitationId: Types.ObjectId): Promise<Invitation> 
    {
        try 
        {
            this.logger.debug(
                `Declining invitation invitationId=${invitationId}`,
                'InvitationService#declineInvitation',
            );
            const invitation = await this.invitationModel.findOne({
                _id: invitationId,
                status: InvitationStatus.PENDING,
                expiresAt: { $gt: new Date() },
            });

            if (!invitation) 
            {
                throw new InvalidInvitationException();
            }

            invitation.status = InvitationStatus.DECLINED;
            await invitation.save();

            this.logger.debug(
                `Invitation declined for email ${invitation.invitedEmail}`,
                'InvitationService#declineInvitation',
            );
            
            // Populate before returning
            await invitation.populate('orgId', 'id name');
            await invitation.populate('invitedBy', 'id firstName lastName email profilePictureUrl');
            
            return invitation;
        }
        catch (error)
        {
            // Re-throw known exceptions
            if (error instanceof InvalidInvitationException) 
            {
                throw error;
            }
            
            // Handle database errors
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
                `Database error during invitation decline by id`,
                errorStack,
                'InvitationService#declineInvitation',
            );
            throw new DatabaseOperationException('invitation decline', errorMessage);
        }
    }

    async revokeInvitation(invitationId: Types.ObjectId, orgId: Types.ObjectId): Promise<Invitation> 
    {
        try 
        {
            this.logger.debug(
                `Revoking invitation invitationId=${invitationId} orgId=${orgId}`,
                'InvitationService#revokeInvitation',
            );
            const invitation = await this.invitationModel.findOne({
                _id: invitationId,
                orgId,
                status: InvitationStatus.PENDING,
            });

            if (!invitation) 
            {
                throw new InvitationNotFoundException(invitationId.toString());
            }

            invitation.status = InvitationStatus.REVOKED;
            await invitation.save();

            this.logger.debug(
                `Invitation revoked for email ${invitation.invitedEmail}`,
                'InvitationService#revokeInvitation',
            );
            
            // Populate before returning
            await invitation.populate('orgId', 'id name');
            await invitation.populate('invitedBy', 'id firstName lastName email profilePictureUrl');
            
            return invitation;
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
}
