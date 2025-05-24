import { IsNotEmpty, IsEnum, IsOptional, IsNumber, IsString, IsDateString, IsBoolean, Min } from 'class-validator';
import { SubscriptionTier, BillingPeriod } from '../schemas/subscription.schema';

export class CreateSubscriptionDto
{
    @IsNotEmpty()
    @IsString()
    userId!: string;

    @IsEnum(SubscriptionTier)
    tier!: SubscriptionTier;

    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsEnum(BillingPeriod)
    billingPeriod?: BillingPeriod;

    @IsOptional()
    limits?: {
        maxOrganizations?: number;
    };

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    lastRenewDate?: string;

    @IsOptional()
    @IsDateString()
    nextRenewDate?: string;

    @IsOptional()
    @IsBoolean()
    autoRenew?: boolean;

    @IsOptional()
    paymentMethod?: {
        type?: string;
        last4?: string;
        expiryMonth?: number;
        expiryYear?: number;
        brand?: string;
    };
}
