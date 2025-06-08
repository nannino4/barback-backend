import { IsEnum, IsBoolean, ValidateIf, IsNotEmpty } from 'class-validator';
import { SubscriptionStatus } from '../schemas/subscription.schema';

export class InUpdateSubscriptionDto 
{
    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    @IsEnum(SubscriptionStatus)
    status?: SubscriptionStatus;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    @IsBoolean()
    autoRenew?: boolean;
}
