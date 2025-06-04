import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { SubscriptionStatus } from '../schemas/subscription.schema';

export class UpdateSubscriptionDto 
{
    @IsOptional()
    @IsEnum(SubscriptionStatus)
    status?: SubscriptionStatus;

    @IsOptional()
    @IsBoolean()
    autoRenew?: boolean;
}
