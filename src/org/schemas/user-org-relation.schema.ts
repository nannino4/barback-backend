import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum OrgRole {
    OWNER = 'owner',
    MANAGER = 'manager',
    STAFF = 'staff',
}

@Schema({ timestamps: true, collection: 'user_org_relations' })
export class UserOrgRelation extends Document 
{
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Org', required: true })
    orgId!: Types.ObjectId;

    @Prop({ type: String, enum: OrgRole, required: true })
    orgRole!: OrgRole;

    // createdAt and updatedAt are handled by timestamps: true
}

export const UserOrgRelationSchema = SchemaFactory.createForClass(UserOrgRelation);

// Define indexes as required by coding guidelines
UserOrgRelationSchema.index({ userId: 1, orgId: 1 }, { unique: true });
UserOrgRelationSchema.index({ userId: 1 });
UserOrgRelationSchema.index({ orgId: 1 });
