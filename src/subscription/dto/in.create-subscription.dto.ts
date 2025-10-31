import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { BillingInterval } from '../../common/services/stripe.service';

export class InCreateSubscriptionDto 
{
    @IsOptional()
    @IsEnum(BillingInterval, { message: 'validation.subscription.billingInterval.invalid' })
    billingInterval?: BillingInterval;

    @IsBoolean({ message: 'validation.subscription.isTrial.mustBeBoolean' })
    isTrial: boolean = false;
}
