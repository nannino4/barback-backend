import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Subscription, SubscriptionStatus } from './schemas/subscription.schema';
import { UserService } from '../user/user.service';

@Injectable()
export class SubscriptionService 
{
    private readonly logger = new Logger(SubscriptionService.name);
    private readonly stripe: Stripe;

    constructor(
        @InjectModel(Subscription.name) private readonly subscriptionModel: Model<Subscription>,
        private readonly userService: UserService,
        private readonly configService: ConfigService,
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
        
        this.logger.debug('SubscriptionService initialized', 'SubscriptionService#constructor');
    }

    async createTrialSubscription(userId: Types.ObjectId): Promise<Subscription> 
    {
        this.logger.debug(`Creating trial subscription for user: ${userId}`, 'SubscriptionService#createTrialSubscription');
        
        // Check if user is eligible for trial
        const isEligible = await this.isEligibleForTrial(userId);
        if (!isEligible) 
        {
            this.logger.warn(`User ${userId} is not eligible for trial subscription`, 'SubscriptionService#createTrialSubscription');
            throw new ConflictException('User already has a subscription or is not eligible for trial');
        }

        // Get user to create/update Stripe customer
        const user = await this.userService.findById(userId);
        let stripeCustomerId = user.stripeCustomerId;

        if (!stripeCustomerId) 
        {
            // Create Stripe customer
            const stripeCustomer = await this.stripe.customers.create({
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
            });
            stripeCustomerId = stripeCustomer.id;

            // Update user with Stripe customer ID
            await this.userService.updateStripeCustomerId(userId, stripeCustomerId);
        }

        // Create trial subscription in Stripe (3 months = 90 days)
        // The subscription will automatically convert to paid when trial ends
        const stripeSubscription = await this.stripe.subscriptions.create({
            customer: stripeCustomerId,
            trial_end: Math.floor((Date.now() + (90 * 24 * 60 * 60 * 1000)) / 1000), // 90 days from now
            items: [
                {
                    price: this.configService.get<string>('STRIPE_BASIC_PLAN_PRICE_ID'),
                },
            ],
            // Ensure the subscription automatically starts billing after trial
            payment_behavior: 'default_incomplete',
            payment_settings: {
                save_default_payment_method: 'on_subscription',
            },
            expand: ['latest_invoice.payment_intent'],
        });

        // Create subscription record
        const subscription = new this.subscriptionModel({
            userId: userId,
            stripeSubscriptionId: stripeSubscription.id,
            status: SubscriptionStatus.TRIALING,
            autoRenew: true,
        });

        await subscription.save();
        this.logger.debug(`Trial subscription created successfully for user: ${userId}`, 'SubscriptionService#createTrialSubscription');
        
        return subscription;
    }

    async findByUserId(userId: Types.ObjectId): Promise<Subscription | null> 
    {
        this.logger.debug(`Finding subscription for user: ${userId}`, 'SubscriptionService#findByUserId');
        
        const subscription = await this.subscriptionModel
            .findOne({ userId: userId })
            .exec();

        return subscription;
    }

    async findById(id: Types.ObjectId): Promise<Subscription> 
    {
        this.logger.debug(`Finding subscription by ID: ${id}`, 'SubscriptionService#findById');
        
        const subscription = await this.subscriptionModel.findById(id).exec();
        if (!subscription) 
        {
            this.logger.warn(`Subscription not found: ${id}`, 'SubscriptionService#findById');
            throw new NotFoundException('Subscription not found');
        }

        return subscription;
    }

    async updateStatus(stripeSubscriptionId: string, status: SubscriptionStatus): Promise<Subscription> 
    {
        this.logger.debug(`Updating subscription status for Stripe ID: ${stripeSubscriptionId} to ${status}`, 'SubscriptionService#updateStatus');
        
        const subscription = await this.subscriptionModel
            .findOneAndUpdate(
                { stripeSubscriptionId },
                { status },
                { new: true }
            )
            .exec();

        if (!subscription) 
        {
            this.logger.warn(`Subscription not found for Stripe ID: ${stripeSubscriptionId}`, 'SubscriptionService#updateStatus');
            throw new NotFoundException('Subscription not found');
        }

        this.logger.debug(`Subscription status updated successfully: ${stripeSubscriptionId}`, 'SubscriptionService#updateStatus');
        return subscription;
    }

    async cancelSubscription(userId: Types.ObjectId): Promise<Subscription> 
    {
        this.logger.debug(`Canceling subscription for user: ${userId}`, 'SubscriptionService#cancelSubscription');
        
        const subscription = await this.findByUserId(userId);
        if (!subscription) 
        {
            throw new NotFoundException('Subscription not found');
        }

        // Cancel in Stripe
        await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

        // Update local status
        subscription.status = SubscriptionStatus.CANCELED;
        subscription.autoRenew = false;
        await subscription.save();

        this.logger.debug(`Subscription canceled successfully for user: ${userId}`, 'SubscriptionService#cancelSubscription');
        return subscription;
    }

    async handleStripeWebhook(event: Stripe.Event): Promise<void> 
    {
        this.logger.debug(`Handling Stripe webhook: ${event.type}`, 'SubscriptionService#handleStripeWebhook');

        switch (event.type) 
        {
        case 'customer.subscription.updated':
            const updatedSubscription = event.data.object as Stripe.Subscription;
            await this.syncSubscriptionFromStripe(updatedSubscription);
            this.logger.debug(`Subscription updated: ${updatedSubscription.id} - Status: ${updatedSubscription.status}`, 'SubscriptionService#handleStripeWebhook');
            break;
        case 'customer.subscription.deleted':
            const deletedSubscription = event.data.object as Stripe.Subscription;
            await this.syncSubscriptionFromStripe(deletedSubscription);
            break;
        case 'customer.subscription.trial_will_end':
            const trialEndingSubscription = event.data.object as Stripe.Subscription;
            this.logger.debug(`Trial ending soon for subscription: ${trialEndingSubscription.id}`, 'SubscriptionService#handleStripeWebhook');
            // This is where you would send reminder emails if needed
            break;
        case 'invoice.payment_succeeded':
            const invoice = event.data.object as any; // Using any to access subscription property
            if (invoice.subscription) 
            {
                this.logger.debug(`Payment succeeded for subscription: ${invoice.subscription}`, 'SubscriptionService#handleStripeWebhook');
                // Trial has converted to paid successfully
            }
            break;
        case 'invoice.payment_failed':
            const failedInvoice = event.data.object as any; // Using any to access subscription property
            if (failedInvoice.subscription) 
            {
                this.logger.warn(`Payment failed for subscription: ${failedInvoice.subscription}`, 'SubscriptionService#handleStripeWebhook');
                // Handle failed payment - subscription may become past_due
            }
            break;
        default:
            this.logger.debug(`Unhandled webhook event type: ${event.type}`, 'SubscriptionService#handleStripeWebhook');
        }
    }

    private async syncSubscriptionFromStripe(stripeSubscription: Stripe.Subscription): Promise<void> 
    {
        this.logger.debug(`Syncing subscription from Stripe: ${stripeSubscription.id}`, 'SubscriptionService#syncSubscriptionFromStripe');

        const status = this.mapStripeStatusToLocal(stripeSubscription.status);
        await this.updateStatus(stripeSubscription.id, status);
    }

    private mapStripeStatusToLocal(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus 
    {
        switch (stripeStatus) 
        {
        case 'trialing':
            return SubscriptionStatus.TRIALING;
        case 'active':
            return SubscriptionStatus.ACTIVE;
        case 'past_due':
            return SubscriptionStatus.PAST_DUE;
        case 'canceled':
            return SubscriptionStatus.CANCELED;
        case 'unpaid':
            return SubscriptionStatus.UNPAID;
        case 'incomplete':
            return SubscriptionStatus.INCOMPLETE;
        case 'incomplete_expired':
            return SubscriptionStatus.INCOMPLETE_EXPIRED;
        case 'paused':
            return SubscriptionStatus.PAUSED;
        default:
            throw new BadRequestException(`Unknown Stripe subscription status: ${stripeStatus}`);
        }
    }

    async getSubscriptionPlans(): Promise<{
        id: string;
        name: string;
        duration: string;
        price: number;
        features: string[];
    }[]> 
    {
        // Return predefined plan configurations
        return [
            {
                id: 'trial',
                name: 'Trial',
                duration: '3 months',
                price: 0,
                features: ['Full access to all features', 'Automatically converts to Basic Plan at trial end'],
            },
            {
                id: 'basic',
                name: 'Basic Plan',
                duration: 'Monthly',
                price: 29.99,
                features: ['Full access to all features', 'Unlimited organizations', 'Email support'],
            },
        ];
    }

    async isEligibleForTrial(userId: Types.ObjectId): Promise<boolean> 
    {
        this.logger.debug(`Checking trial eligibility for user: ${userId}`, 'SubscriptionService#isEligibleForTrial');
        
        // User is eligible for trial if they don't have any subscription yet
        const existingSubscription = await this.findByUserId(userId);
        return !existingSubscription;
    }
}
