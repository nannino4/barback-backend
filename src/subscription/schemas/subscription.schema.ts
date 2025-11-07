import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum SubscriptionStatus 
{
    TRIALING = 'TRIALING',
    ACTIVE = 'ACTIVE',
    PAST_DUE = 'PAST_DUE',
    CANCELED = 'CANCELED',
    UNPAID = 'UNPAID',
    INCOMPLETE = 'INCOMPLETE',
    INCOMPLETE_EXPIRED = 'INCOMPLETE_EXPIRED',
    PAUSED = 'PAUSED',
}

@Schema({ timestamps: true, collection: 'subscriptions' })
export class Subscription extends Document 
{
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId!: Types.ObjectId;

    @Prop({ type: String, required: true })
    stripeSubscriptionId!: string;

    @Prop({ type: String, enum: SubscriptionStatus, required: true })
    status!: SubscriptionStatus;

    @Prop({ type: Boolean, default: true })
    autoRenew!: boolean;

    // createdAt and updatedAt are handled by timestamps: true
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ userId: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ stripeSubscriptionId: 1 }, { unique: true });
