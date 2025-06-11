import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrgRole } from './user-org-relation.schema';

export enum InviteStatus {
    PENDING = 'pending',
    DECLINED = 'declined',
    REVOKED = 'revoked',
    ACCEPTED_PENDING_REGISTRATION = 'accepted_pending_registration',
    ACCEPTED = 'accepted',
}

@Schema({ timestamps: true, collection: 'org_invites' })
export class OrgInvite extends Document 
{
    @Prop({ type: Types.ObjectId, ref: 'Org', required: true })
    orgId!: Types.ObjectId;

    @Prop({ type: String, required: false })
    invitedEmail?: string;

    @Prop({ type: String, enum: OrgRole, required: true })
    role!: OrgRole;

    @Prop({ type: String, enum: InviteStatus, default: InviteStatus.ACCEPTED })
    status!: InviteStatus;

    @Prop({ type: String, required: false })
    invitationToken?: string;

    @Prop({ type: Date, required: false })
    invitationExpires?: Date;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    invitedBy!: Types.ObjectId;

    // createdAt and updatedAt are handled by timestamps: true
}

export const OrgInviteSchema = SchemaFactory.createForClass(OrgInvite);

// Define indexes as required by coding guidelines
OrgInviteSchema.index({ invitedEmail: 1, orgId: 1 }, { unique: true });
OrgInviteSchema.index({ orgId: 1 });
OrgInviteSchema.index({ status: 1 });
OrgInviteSchema.index({ invitedEmail: 1 });
OrgInviteSchema.index({ invitationExpires: 1 });
