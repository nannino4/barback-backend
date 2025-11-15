import { Expose } from 'class-transformer';
import { SubscriptionStatus } from '../schemas/subscription.schema';

export class OutStripeSubscriptionStatusDto
{
    @Expose()
    stripeSubscriptionId!: string;

    @Expose()
    status!: SubscriptionStatus;
}
