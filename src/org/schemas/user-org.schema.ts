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
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Org', required: true })
    orgId!: Types.ObjectId;

    @Prop({ type: String, enum: OrgRole, required: true })
    role!: OrgRole;

    // createdAt and updatedAt are handled by timestamps: true
}

export const UserOrgSchema = SchemaFactory.createForClass(UserOrg);

UserOrgSchema.index({ userId: 1 });
UserOrgSchema.index({ orgId: 1 });
UserOrgSchema.index({ role: 1 });
// Composite unique index for userId and orgId
UserOrgSchema.index({ userId: 1, orgId: 1 }, { unique: true });
