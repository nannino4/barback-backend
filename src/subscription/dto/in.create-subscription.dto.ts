import { IsEnum, IsBoolean, ValidateIf, IsNotEmpty } from 'class-validator';
import { SubscriptionStatus } from '../schemas/subscription.schema';

export class InCreateSubscriptionDto 
{
    @IsEnum(SubscriptionStatus)
    status!: SubscriptionStatus;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    @IsBoolean()
    autoRenew?: boolean;
}
