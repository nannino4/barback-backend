import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum OrganizationRole
{
    OWNER = 'owner',
    MANAGER = 'manager',
    STAFF = 'staff',
}

@Schema({ timestamps: true, collection: 'user_organizations' })
export class UserOrganization extends Document
{
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    userId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
    organizationId!: Types.ObjectId;

    @Prop({ type: String, enum: OrganizationRole, required: true, index: true })
    role!: OrganizationRole;

    // createdAt and updatedAt are handled by timestamps: true
}

export const UserOrganizationSchema = SchemaFactory.createForClass(UserOrganization);

// Composite unique index for userId and organizationId
UserOrganizationSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
