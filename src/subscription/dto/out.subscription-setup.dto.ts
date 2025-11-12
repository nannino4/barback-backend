import { Expose } from 'class-transformer';

/**
 * DTO for subscription setup response
 * Returns Stripe subscription ID and clientSecret for Payment Element
 * 
 * Note: Local subscription is NOT created yet - it will be created by webhook
 * after payment confirmation
 */
export class OutSubscriptionSetupDto 
{
    @Expose()
    stripeSubscriptionId!: string;

    @Expose()
    clientSecret!: string;
}
