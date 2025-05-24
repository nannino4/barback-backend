import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum SubscriptionStatus
{
    PENDING = 'pending',
    ACTIVE = 'active',
    EXPIRED = 'expired',
    SUSPENDED = 'suspended',
}

export enum SubscriptionTier
{
    TRIAL = 'trial',
    BASIC = 'basic',
    PREMIUM = 'premium',
}

export enum BillingPeriod
{
    MONTHLY = 'monthly',
    QUARTERLY = 'quarterly',
    ANNUAL = 'annual',
}

@Schema({ timestamps: true })
export class Subscription extends Document
{
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId!: Types.ObjectId;

    @Prop({ required: true, enum: SubscriptionTier, default: SubscriptionTier.TRIAL })
    tier!: SubscriptionTier;

    @Prop({ required: true, default: 0 })
    price!: number;

    @Prop({ required: true, default: 'EUR' })
    currency!: string;

    @Prop({ required: true, enum: BillingPeriod, default: BillingPeriod.MONTHLY })
    billingPeriod!: BillingPeriod;

    @Prop({ type: Object })
    limits?: {
        maxOrganizations?: number;
    };

    @Prop({ required: true })
    startDate!: Date;

    @Prop()
    lastRenewDate?: Date;

    @Prop()
    nextRenewDate?: Date;

    @Prop({ default: true })
    autoRenew!: boolean;

    @Prop({ required: true, enum: SubscriptionStatus, default: SubscriptionStatus.PENDING })
    status!: SubscriptionStatus;

    @Prop({ type: Object })
    paymentMethod?: {
        type?: string;
        last4?: string;
        expiryMonth?: number;
        expiryYear?: number;
        brand?: string;
    };

    @Prop({ type: [Object] })
    payments?: Array<{
        amount?: number;
        currency?: string;
        date?: Date;
        status?: string;
        transactionId?: string;
    }>;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
