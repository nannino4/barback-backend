import { SubscriptionStatus } from '../schemas/subscription.schema';

export class OutSubscriptionDto 
{
    id!: string;
    status!: SubscriptionStatus;
    autoRenew!: boolean;
    createdAt!: Date;
    updatedAt!: Date;
}
