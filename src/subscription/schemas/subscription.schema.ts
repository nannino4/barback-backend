import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum SubscriptionStatus 
{
    TRIALING = 'trialing',
    ACTIVE = 'active',
    PAST_DUE = 'past_due',
    CANCELED = 'canceled',
    UNPAID = 'unpaid',
    INCOMPLETE = 'incomplete',
    INCOMPLETE_EXPIRED = 'incomplete_expired',
    PAUSED = 'paused',
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

    // Timestamp fields
    createdAt!: Date;
    updatedAt!: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ userId: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ stripeSubscriptionId: 1 }, { unique: true });
