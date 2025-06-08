import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface OrganizationSettings {
    defaultCurrency: string;
}

@Schema({ timestamps: true, collection: 'organizations' })
export class Organization extends Document 
{
    @Prop({ type: String, required: true })
    name!: string;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    ownerId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Subscription', required: true })
    subscriptionId!: Types.ObjectId;

    @Prop({
        type: Object,
        default: () => ({ defaultCurrency: 'EUR' }),
    })
    settings!: OrganizationSettings;

    // createdAt and updatedAt are handled by timestamps: true
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

// Define indexes as required by coding guidelines
OrganizationSchema.index({ ownerId: 1 });
OrganizationSchema.index({ subscriptionId: 1 }, { unique: true });
