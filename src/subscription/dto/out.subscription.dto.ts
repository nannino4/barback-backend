import { Expose } from 'class-transformer';
import { SubscriptionStatus } from '../schemas/subscription.schema';

export class OutSubscriptionDto 
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
