import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum SubscriptionStatus
{
    PENDING = 'pending',
    TRIAL = 'trial',
    ACTIVE = 'active',
    INACTIVE = 'inactive',
}

export enum BillingPeriod
{
    MONTHLY = 'monthly',
    QUARTERLY = 'quarterly',
    ANNUAL = 'annual',
}

@Schema({ timestamps: true, collection: 'subscriptions' })
export class Subscription extends Document
{
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId!: Types.ObjectId;

    @Prop({ required: true, default: 0 })
    price!: number;

    @Prop({ required: true, default: 'EUR' })
    currency!: string;

    @Prop({ required: true, enum: BillingPeriod, default: BillingPeriod.MONTHLY })
    billingPeriod!: BillingPeriod;

    @Prop({ type: Object, required: false })
    limits?: {
        maxOrganizations?: number;
    };

    @Prop({ required: true })
    startDate!: Date;

    @Prop({ required: false })
    lastRenewDate?: Date;

    @Prop({ required: true })
    nextRenewDate!: Date;

    @Prop({ default: true })
    autoRenew!: boolean;

    @Prop({ required: true, enum: SubscriptionStatus, default: SubscriptionStatus.PENDING })
    status!: SubscriptionStatus;

    @Prop({ type: Object, required: false })
    paymentMethod?: {
        paymentMethodId?: string;
        type?: string;
        last4?: string;
        lastFour?: string;
        expiryDate?: string;
        brand?: string;
    };

    @Prop({ type: [Object], default: [] })
    payments?: Array<{
        paymentId?: string;
        amount?: number;
        currency?: string;
        date?: Date;
        status?: string;
        transactionId?: string;
    }>;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ userId: 1 });
SubscriptionSchema.index({ status: 1 });
