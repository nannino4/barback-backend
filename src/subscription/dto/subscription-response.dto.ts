import { SubscriptionStatus } from '../schemas/subscription.schema';

export class SubscriptionResponseDto 
{
    id!: string;
    status!: SubscriptionStatus;
    autoRenew!: boolean;
    createdAt!: Date;
    updatedAt!: Date;
}
