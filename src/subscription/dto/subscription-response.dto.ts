import { Expose } from 'class-transformer';
import { SubscriptionStatus } from '../schemas/subscription.schema';

export class SubscriptionResponseDto 
{
    @Expose()
    id!: string;
    
    @Expose()
    status!: SubscriptionStatus;
    
    @Expose()
    autoRenew!: boolean;
    
    @Expose()
    createdAt!: Date;
    
    @Expose()
    updatedAt!: Date;
}
