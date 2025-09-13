import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { BillingInterval } from '../../common/services/stripe.service';

export class InCreateSubscriptionDto 
{
    @IsOptional()
    @IsEnum(BillingInterval)
    billingInterval?: BillingInterval;

    @IsBoolean()
    isTrial: boolean = false;
}
