import { IsEnum, IsBoolean, ValidateIf, IsNotEmpty } from 'class-validator';
import { SubscriptionStatus } from '../schemas/subscription.schema';

export class InUpdateSubscriptionDto 
{
    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty({ message: 'validation.subscription.status.required' })
    @IsEnum(SubscriptionStatus, { message: 'validation.subscription.status.invalid' })
    status?: SubscriptionStatus;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty({ message: 'validation.subscription.autoRenew.required' })
    @IsBoolean({ message: 'validation.subscription.autoRenew.mustBeBoolean' })
    autoRenew?: boolean;
}
