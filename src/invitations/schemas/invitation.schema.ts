import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrgRole } from './user-org-relation.schema';

export enum InvitationStatus {
    PENDING = 'pending',
    DECLINED = 'declined',
    REVOKED = 'revoked',
    ACCEPTED_PENDING_REGISTRATION = 'accepted_pending_registration',
    ACCEPTED = 'accepted',
}

@Schema({ timestamps: true, collection: 'org_invites' })
export class Invitation extends Document 
{
    @Prop({ type: Types.ObjectId, ref: 'Org', required: true })
    orgId!: Types.ObjectId;

    @Prop({ type: String, required: false })
    invitedEmail?: string;

    @Prop({ type: String, enum: OrgRole, required: true })
    role!: OrgRole;

    @Prop({ type: String, enum: InvitationStatus, default: InvitationStatus.PENDING })
    status!: InvitationStatus;

    @Prop({ type: String, required: false })
    invitationToken?: string;

    @Prop({ type: Date, required: false })
    invitationExpires?: Date;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    invitedBy!: Types.ObjectId;

    // createdAt and updatedAt are handled by timestamps: true
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);

// Define indexes as required by coding guidelines
InvitationSchema.index({ invitedEmail: 1, orgId: 1 }, { unique: true });
InvitationSchema.index({ orgId: 1 });
InvitationSchema.index({ status: 1 });
InvitationSchema.index({ invitedEmail: 1 });
InvitationSchema.index({ invitationExpires: 1 });
