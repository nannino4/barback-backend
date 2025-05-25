import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class OrgSettings
{
    @Prop({ type: String, default: 'EUR' })
    defaultCurrency!: string; // Added ! for definite assignment assertion

    // Add other org-specific settings here
}
export const OrgSettingsSchema = SchemaFactory.createForClass(OrgSettings);

@Schema({ timestamps: true, collection: 'organizations' })
export class Org extends Document
{
    @Prop({ type: String, required: true })
    name!: string; // Added ! for definite assignment assertion

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    ownerId!: Types.ObjectId; // Added ! for definite assignment assertion

    @Prop({ type: Types.ObjectId, ref: 'Subscription', required: true, unique: true })
    subscriptionId!: Types.ObjectId;

    @Prop({ type: OrgSettingsSchema, required: false })
    settings?: OrgSettings;

    // createdAt and updatedAt are handled by timestamps: true
}

export const OrgSchema = SchemaFactory.createForClass(Org);

OrgSchema.index({ ownerId: 1 });
OrgSchema.index({ subscriptionId: 1 }, { unique: true });
