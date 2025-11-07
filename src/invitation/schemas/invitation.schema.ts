import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrgRole } from '../../org/schemas/user-org-relation.schema';

export enum InvitationStatus {
    PENDING = 'PENDING',
    DECLINED = 'DECLINED',
    REVOKED = 'REVOKED',
    ACCEPTED = 'ACCEPTED',
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

    @Prop({ type: Date, required: false })
    expiresAt?: Date;

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
InvitationSchema.index({ expiresAt: 1 });
