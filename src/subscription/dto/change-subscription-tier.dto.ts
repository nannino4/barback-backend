import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { SubscriptionTier } from '../schemas/subscription.schema';

export class ChangeSubscriptionTierDto
{
    @IsNotEmpty()
    @IsEnum(SubscriptionTier)
    newTier!: SubscriptionTier;

    @IsOptional()
    @IsString()
    reason?: string;
}
