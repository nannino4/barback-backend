import { IsOptional, IsString } from 'class-validator';

export class CancelSubscriptionDto
{
    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsString()
    cancelAt?: string; // 'end_of_period' or 'immediately'
}
