import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum OrgRole
{
    OWNER = 'owner',
    MANAGER = 'manager',
    STAFF = 'staff',
}

@Schema({ timestamps: true, collection: 'user_organizations' })
export class UserOrg extends Document
{
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    userId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Org', required: true, index: true })
    orgId!: Types.ObjectId;

    @Prop({ type: String, enum: OrgRole, required: true, index: true })
    role!: OrgRole;

    // createdAt and updatedAt are handled by timestamps: true
}

export const UserOrgSchema = SchemaFactory.createForClass(UserOrg);

// Composite unique index for userId and orgId
UserOrgSchema.index({ userId: 1, orgId: 1 }, { unique: true });
