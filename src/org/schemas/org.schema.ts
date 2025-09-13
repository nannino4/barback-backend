import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface OrgSettings {
    defaultCurrency: string;
}

@Schema({ timestamps: true, collection: 'orgs' })
export class Org extends Document 
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
    settings!: OrgSettings;

    // createdAt and updatedAt are handled by timestamps: true
}

export const OrgSchema = SchemaFactory.createForClass(Org);

OrgSchema.index({ ownerId: 1 });
OrgSchema.index({ subscriptionId: 1 }, { unique: true });
OrgSchema.index({ ownerId: 1, name: 1 }, { unique: true });
