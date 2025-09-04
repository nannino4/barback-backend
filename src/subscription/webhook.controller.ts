import { Controller, Post, RawBodyRequest, Req, Headers, BadRequestException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { StripeService } from '../common/services/stripe.service';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus } from './schemas/subscription.schema';
import Stripe from 'stripe';
import { CustomLogger } from '../common/logger/custom.logger';

@Controller('webhooks')
export class WebhookController 
{
    private readonly webhookSecret: string;

    constructor(
        private readonly subscriptionService: SubscriptionService,
        private readonly stripeService: StripeService,
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
            const invoice = event.data.object as Stripe.Invoice;
            if ((invoice as any).subscription) 
            {
                this.logger.debug(`Payment succeeded for subscription: ${(invoice as any).subscription}`, 'WebhookController#handleStripeWebhook');
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
