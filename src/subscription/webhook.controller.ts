import { Controller, Post, RawBodyRequest, Req, Headers, BadRequestException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CustomLogger } from '../common/logger/custom.logger';

@Controller('webhooks')
export class WebhookController 
{
    private readonly stripe: Stripe;
    private readonly webhookSecret: string;

    constructor(
        private readonly subscriptionService: SubscriptionService,
        private readonly configService: ConfigService,
        private readonly logger: CustomLogger,
    ) 
    {
        const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        if (!stripeSecretKey) 
        {
            throw new Error('STRIPE_SECRET_KEY is not configured');
        }
        
        this.stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2025-05-28.basil',
        });

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
            event = this.stripe.webhooks.constructEvent(req.rawBody!, signature, this.webhookSecret);
        } 
        catch (err) 
        {
            this.logger.error(`Webhook signature verification failed: ${err}`, 'WebhookController#handleStripeWebhook');
            throw new BadRequestException('Webhook signature verification failed');
        }

        await this.subscriptionService.handleStripeWebhook(event);

        return { received: true };
    }
}
