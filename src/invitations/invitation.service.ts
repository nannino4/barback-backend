import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { Invitation, InvitationStatus } from './schemas/invitation.schema';
import { UserOrgRelation, OrgRole } from '../org/schemas/user-org-relation.schema';
import { UserService } from '../user/user.service';
import { EmailService } from '../email/email.service';
import { InCreateInvitationDto } from './dto/in.create-invitation.dto';

@Injectable()
export class InvitationService 
{
    private readonly logger = new Logger(InvitationService.name);

    constructor(
        @InjectModel(Invitation.name) private readonly invitationModel: Model<Invitation>,
        @InjectModel(UserOrgRelation.name) private readonly userOrgRelationModel: Model<UserOrgRelation>,
        private readonly userService: UserService,
        private readonly emailService: EmailService,
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
            throw new BadRequestException('Cannot invite users as owners. Organizations can only have one owner.');
        }

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
                throw new ConflictException('User is already a member of this organization');
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
            throw new ConflictException('A pending invitation already exists for this email address');
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
            throw new BadRequestException('Failed to send invitation email');
        }

        return invitation;
    }

    async findPendingInvitationsByEmail(email: string): Promise<Invitation[]> 
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

    async findPendingInvitationsByOrg(orgId: Types.ObjectId): Promise<Invitation[]> 
    {
        return this.invitationModel
            .find({
                orgId,
                status: { $in: [InvitationStatus.PENDING] },
            })
            .sort({ createdAt: -1 })
            .exec();
    }

    async acceptInvitation(token: string, userId?: Types.ObjectId): Promise<void> 
    {
        const invitation = await this.invitationModel.findOne({
            invitationToken: token,
            status: InvitationStatus.PENDING,
            invitationExpires: { $gt: new Date() },
        });

        if (!invitation) 
        {
            throw new NotFoundException('Invalid or expired invitation token');
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

    async declineInvitation(token: string): Promise<void> 
    {
        const invitation = await this.invitationModel.findOne({
            invitationToken: token,
            status: InvitationStatus.PENDING,
            invitationExpires: { $gt: new Date() },
        });

        if (!invitation) 
        {
            throw new NotFoundException('Invalid or expired invitation token');
        }

        invitation.status = InvitationStatus.DECLINED;
        await invitation.save();

        this.logger.debug(
            `Invitation declined for email ${invitation.invitedEmail}`,
            'InvitationService#declineInvitation',
        );
    }

    async revokeInvitation(invitationId: string, orgId: Types.ObjectId): Promise<void> 
    {
        const invitation = await this.invitationModel.findOne({
            _id: invitationId,
            orgId,
            status: InvitationStatus.PENDING,
        });

        if (!invitation) 
        {
            throw new NotFoundException('Invitation not found or cannot be revoked');
        }

        invitation.status = InvitationStatus.REVOKED;
        await invitation.save();

        this.logger.debug(
            `Invitation revoked for email ${invitation.invitedEmail}`,
            'InvitationService#revokeInvitation',
        );
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
        return this.invitationModel
            .findOne({
                invitationToken: token,
                status: InvitationStatus.PENDING,
                invitationExpires: { $gt: new Date() },
            })
            .populate('orgId', 'name')
            .exec();
    }

    private async completeInvitationAcceptance(invitation: Invitation, userId: Types.ObjectId): Promise<void> 
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

    private generateInvitationToken(): string 
    {
        return randomBytes(32).toString('hex');
    }
}
