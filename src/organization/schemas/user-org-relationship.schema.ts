import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum OrgRole {
    OWNER = 'owner',
    MANAGER = 'manager',
    STAFF = 'staff',
}

export enum RelationshipStatus {
    ACTIVE = 'active',
    PENDING = 'pending',
    DECLINED = 'declined',
    REVOKED = 'revoked',
    ACCEPTED_PENDING_REGISTRATION = 'accepted_pending_registration',
}

@Schema({ timestamps: true, collection: 'user_org_relationships' })
export class UserOrgRelationship extends Document 
{
    @Prop({ type: Types.ObjectId, ref: 'User', required: false })
    userId?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
    organizationId!: Types.ObjectId;

    @Prop({ type: String, enum: OrgRole, required: true })
    role!: OrgRole;

    @Prop({ type: String, enum: RelationshipStatus, default: RelationshipStatus.ACTIVE })
    status!: RelationshipStatus;

    @Prop({ type: String, required: false })
    invitedEmail?: string;

    @Prop({ type: String, required: false })
    invitationToken?: string;

    @Prop({ type: Date, required: false })
    invitationExpires?: Date;

    @Prop({ type: Types.ObjectId, ref: 'User', required: false })
    invitedBy?: Types.ObjectId;

    // createdAt and updatedAt are handled by timestamps: true
}

export const UserOrgRelationshipSchema = SchemaFactory.createForClass(UserOrgRelationship);

// Define indexes as required by coding guidelines
UserOrgRelationshipSchema.index({ userId: 1, organizationId: 1 }, { unique: true, sparse: true });
UserOrgRelationshipSchema.index({ userId: 1 });
UserOrgRelationshipSchema.index({ organizationId: 1 });
UserOrgRelationshipSchema.index({ status: 1 });
UserOrgRelationshipSchema.index({ invitedEmail: 1, organizationId: 1 }, { unique: true, sparse: true });
UserOrgRelationshipSchema.index({ invitedEmail: 1 });
UserOrgRelationshipSchema.index({ invitationToken: 1 }, { unique: true, sparse: true });
UserOrgRelationshipSchema.index({ invitationExpires: 1 });
