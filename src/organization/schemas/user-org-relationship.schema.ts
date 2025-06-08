import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum OrgRole {
    OWNER = 'owner',
    MANAGER = 'manager',
    STAFF = 'staff',
}

@Schema({ timestamps: true, collection: 'user_org_relationships' })
export class UserOrgRelationship extends Document 
{
    @Prop({ type: Types.ObjectId, ref: 'User', required: false })
    userId?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Org', required: true })
    organizationId!: Types.ObjectId;

    @Prop({ type: String, enum: OrgRole, required: true })
    role!: OrgRole;

    // createdAt and updatedAt are handled by timestamps: true
}

export const UserOrgRelationshipSchema = SchemaFactory.createForClass(UserOrgRelationship);

// Define indexes as required by coding guidelines
UserOrgRelationshipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
UserOrgRelationshipSchema.index({ userId: 1 });
UserOrgRelationshipSchema.index({ organizationId: 1 });
