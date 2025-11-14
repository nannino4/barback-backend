import { Controller, Post, RawBodyRequest, Req, Headers, BadRequestException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { StripeService } from '../common/services/stripe.service';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus } from './schemas/subscription.schema';
import Stripe from 'stripe';
import { CustomLogger } from '../common/logger/custom.logger';
import { Types } from 'mongoose';

@Controller('webhooks')
export class WebhookController 
{
    private readonly webhookSecret: string;

    constructor(
        private readonly subscriptionService: SubscriptionService,
        private readonly stripeService: StripeService,
        private readonly userService: UserService,
        private readonly configService: ConfigService,
        private readonly logger: CustomLogger,
    ) 
    {
        const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
        if (!webhookSecret) 
        {
            throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
        }
        this.webhookSecret = webhookSecret;
    }

    @Post('stripe')
    async handleStripeWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('stripe-signature') signature: string,
    ): Promise<{ received: boolean }> 
    {
        this.logger.debug('Received Stripe webhook', 'WebhookController#handleStripeWebhook');

        if (!signature) 
        {
            throw new BadRequestException('Missing stripe-signature header');
        }

        let event: Stripe.Event;

        try 
        {
            event = this.stripeService.constructWebhookEvent(req.rawBody!, signature, this.webhookSecret);
        } 
        catch (err) 
        {
            this.logger.error(`Webhook signature verification failed: ${err}`, 'WebhookController#handleStripeWebhook');
            throw new BadRequestException('Webhook signature verification failed');
        }
        this.logger.debug(`Handling webhook event: ${event.type}`, 'WebhookController#handleStripeWebhook');
        switch (event.type) 
        {
        case 'customer.subscription.updated':
        {
            const subscription = event.data.object as Stripe.Subscription;
            await this.subscriptionService.syncSubscriptionFromStripe(subscription);
            break;
        }
        case 'customer.subscription.deleted':
        {
            const subscription = event.data.object as Stripe.Subscription;
            await this.subscriptionService.updateStatus(subscription.id, SubscriptionStatus.CANCELED);
            break;
        }
        case 'invoice.payment_succeeded':
        {
            this.logger.debug(`Processing invoice.payment_succeeded event with id: ${event.id}`, 'WebhookController#handleStripeWebhook');
            const invoice = event.data.object as Stripe.Invoice;
            const subscriptionData = invoice.parent?.subscription_details?.subscription;
            // Subscription ID can be a string or Subscription object
            const subscriptionId = typeof subscriptionData === 'string' 
                ? subscriptionData 
                : subscriptionData?.id;
            
            if (subscriptionId) 
            {
                this.logger.debug(
                    `Payment succeeded for subscription: ${subscriptionId}`,
                    'WebhookController#handleStripeWebhook'
                );
                
                try 
                {
                    // Fetch full subscription details from Stripe
                    const stripeSubscription = await this.stripeService.retrieveSubscription(subscriptionId);
                    
                    // Get customer ID from subscription
                    const customerData = stripeSubscription.customer;
                    const customerId = typeof customerData === 'string'
                        ? customerData
                        : customerData?.id;
                    
                    if (!customerId) 
                    {
                        this.logger.error(
                            `No customer ID found in subscription ${subscriptionId}`,
                            undefined,
                            'WebhookController#handleStripeWebhook'
                        );
                        break;
                    }
                    
                    // Find user by Stripe customer ID
                    const user = await this.userService.findByStripeCustomerId(customerId);
                    
                    if (!user) 
                    {
                        this.logger.error(
                            `User not found for Stripe customer ${customerId}`,
                            undefined,
                            'WebhookController#handleStripeWebhook'
                        );
                        break;
                    }
                    
                    // Create local subscription record
                    await this.subscriptionService.createFromStripeSubscription(
                        stripeSubscription,
                        user._id as Types.ObjectId
                    );
                    
                    this.logger.debug(
                        `Local subscription created for Stripe subscription ${subscriptionId}`,
                        'WebhookController#handleStripeWebhook'
                    );
                } 
                catch (error) 
                {
                    this.logger.error(
                        `Failed to create local subscription for ${subscriptionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        error instanceof Error ? error.stack : undefined,
                        'WebhookController#handleStripeWebhook'
                    );
                }
            }
            break;
        }
        case 'invoice.payment_failed':
        {
            const invoice = event.data.object as Stripe.Invoice;
            if ((invoice as any).subscription) 
            {
                this.logger.warn(`Payment failed for subscription: ${(invoice as any).subscription}`, 'WebhookController#handleStripeWebhook');
            }
            break;
        }
        default:
            this.logger.debug(`Unhandled webhook event type: ${event.type}`, 'WebhookController#handleStripeWebhook');
        }

        return { received: true };
    }
}
