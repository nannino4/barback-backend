import { PartialType } from '@nestjs/mapped-types';
import { CreateSubscriptionDto } from './create-subscription.dto';
import { IsOptional, IsEnum, IsDateString, IsString, IsBoolean, IsNumber } from 'class-validator';
import { SubscriptionStatus, SubscriptionTier, BillingPeriod } from '../schemas/subscription.schema';

export class UpdateSubscriptionDto extends PartialType(CreateSubscriptionDto)
{
    @IsOptional()
    @IsEnum(SubscriptionTier)
    tier?: SubscriptionTier;

    @IsOptional()
    @IsEnum(SubscriptionStatus)
    status?: SubscriptionStatus;

    @IsOptional()
    @IsNumber()
    price?: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsEnum(BillingPeriod)
    billingPeriod?: BillingPeriod;

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
    limits?: {
        maxOrganizations?: number;
    };

    @IsOptional()
    paymentMethod?: {
        type?: string;
        last4?: string;
        expiryMonth?: number;
        expiryYear?: number;
        brand?: string;
    };
}
