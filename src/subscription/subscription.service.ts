import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Subscription, SubscriptionStatus } from './schemas/subscription.schema';
import { UserService } from '../user/user.service';
import { CustomLogger } from '../common/logger/custom.logger';
import { DatabaseOperationException } from '../common/exceptions/database.exceptions';
import { 
    StripeConfigurationException, 
    StripeCustomerException, 
    StripeSubscriptionException,
    StripeServiceUnavailableException,
} from '../common/exceptions/stripe.exceptions';
import { 
    NotEligibleForTrialException,
    SubscriptionNotFoundException,
    SubscriptionNotFoundByIdException,
    InvalidSubscriptionOperationException,
} from './exceptions/subscription.exceptions';

@Injectable()
export class SubscriptionService 
{
    private readonly stripe: Stripe;
    private readonly stripeBasicPlanPriceId: string;

    constructor(
        @InjectModel(Subscription.name) private readonly subscriptionModel: Model<Subscription>,
        private readonly userService: UserService,
        private readonly configService: ConfigService,
        private readonly logger: CustomLogger,
    ) 
    {
        const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        if (!stripeSecretKey) 
        {
            this.logger.error('STRIPE_SECRET_KEY is not configured', undefined, 'SubscriptionService#constructor');
            throw new StripeConfigurationException('STRIPE_SECRET_KEY is not configured');
        }

        this.stripeBasicPlanPriceId = this.configService.get<string>('STRIPE_BASIC_PLAN_PRICE_ID')!;
        if (!this.stripeBasicPlanPriceId) 
        {
            this.logger.error('STRIPE_BASIC_PLAN_PRICE_ID is not configured', undefined, 'SubscriptionService#constructor');
            throw new StripeConfigurationException('STRIPE_BASIC_PLAN_PRICE_ID is not configured');
        }
        
        try 
        {
            this.stripe = new Stripe(stripeSecretKey, {
                apiVersion: '2025-05-28.basil',
            });
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown Stripe initialization error';
            this.logger.error(`Failed to initialize Stripe: ${errorMessage}`, error instanceof Error ? error.stack : undefined, 'SubscriptionService#constructor');
            throw new StripeConfigurationException(`Failed to initialize Stripe: ${errorMessage}`);
        }
        
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
            throw new NotEligibleForTrialException('User already has a subscription or is not eligible for trial');
        }

        // Get user to create/update Stripe customer
        const user = await this.userService.findById(userId);
        let stripeCustomerId = user.stripeCustomerId;

        // Create Stripe customer if needed
        if (!stripeCustomerId) 
        {
            try 
            {
                const stripeCustomer = await this.stripe.customers.create({
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`,
                });
                stripeCustomerId = stripeCustomer.id;
            }
            catch (error)
            {
                this.logger.error(`Failed to create Stripe customer for user: ${userId}`, error instanceof Error ? error.stack : undefined, 'SubscriptionService#createTrialSubscription');
                this.handleStripeError(error, 'customer creation');
            }
            // Update user with Stripe customer ID
            await this.userService.updateStripeCustomerId(userId, stripeCustomerId);
        }

        // Create trial subscription in Stripe
        let stripeSubscription: Stripe.Subscription;
        try 
        {
            stripeSubscription = await this.stripe.subscriptions.create({
                customer: stripeCustomerId!,
                trial_end: Math.floor((Date.now() + (90 * 24 * 60 * 60 * 1000)) / 1000), // 90 days from now
                items: [
                    {
                        price: this.stripeBasicPlanPriceId,
                    },
                ],
                // Ensure the subscription automatically starts billing after trial
                payment_behavior: 'default_incomplete',
                payment_settings: {
                    save_default_payment_method: 'on_subscription',
                },
                expand: ['latest_invoice.payment_intent'],
            });
        }
        catch (error)
        {
            this.logger.error(`Failed to create Stripe subscription for user: ${userId}`, error instanceof Error ? error.stack : undefined, 'SubscriptionService#createTrialSubscription');
            this.handleStripeError(error, 'subscription creation');
        }

        // Create subscription record in database
        try 
        {
            const subscription = new this.subscriptionModel({
                userId: userId,
                stripeSubscriptionId: stripeSubscription.id,
                status: SubscriptionStatus.TRIALING,
                autoRenew: true,
            });

            await subscription.save();
            return subscription;
        }
        catch (error)
        {
            // If database save fails, cleanup Stripe subscription
            this.logger.error(`Failed to save subscription to database for user: ${userId}. Attempting cleanup of Stripe subscription: ${stripeSubscription.id}`, error instanceof Error ? error.stack : undefined, 'SubscriptionService#createTrialSubscription');
            
            try 
            {
                await this.stripe.subscriptions.cancel(stripeSubscription.id);
            }
            catch (cleanupError)
            {
                this.logger.error(`Failed to cleanup Stripe subscription: ${stripeSubscription.id}`, cleanupError instanceof Error ? cleanupError.stack : undefined, 'SubscriptionService#createTrialSubscription');
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            throw new DatabaseOperationException('subscription creation', errorMessage);
        }
    }

    async findByUserId(userId: Types.ObjectId): Promise<Subscription | null> 
    {
        this.logger.debug(`Finding subscription for user: ${userId}`, 'SubscriptionService#findByUserId');
        
        try 
        {
            return await this.subscriptionModel
                .findOne({ userId: userId })
                .exec();
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Database error while finding subscription for user: ${userId} - ${errorMessage}`, error instanceof Error ? error.stack : undefined, 'SubscriptionService#findByUserId');
            throw new DatabaseOperationException('subscription lookup by user ID', errorMessage);
        }
    }

    async findById(id: Types.ObjectId): Promise<Subscription> 
    {
        this.logger.debug(`Finding subscription by ID: ${id}`, 'SubscriptionService#findById');
        
        try 
        {
            const subscription = await this.subscriptionModel.findById(id).exec();
            if (!subscription) 
            {
                throw new SubscriptionNotFoundByIdException(id.toString());
            }
            return subscription;
        }
        catch (error)
        {
            if (error instanceof SubscriptionNotFoundByIdException) 
            {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Database error while finding subscription by ID: ${id} - ${errorMessage}`, error instanceof Error ? error.stack : undefined, 'SubscriptionService#findById');
            throw new DatabaseOperationException('subscription lookup by ID', errorMessage);
        }
    }

    async updateStatus(stripeSubscriptionId: string, status: SubscriptionStatus): Promise<Subscription> 
    {
        this.logger.debug(`Updating subscription status for Stripe ID: ${stripeSubscriptionId} to ${status}`, 'SubscriptionService#updateStatus');
        
        try 
        {
            const subscription = await this.subscriptionModel
                .findOneAndUpdate(
                    { stripeSubscriptionId },
                    { status },
                    { new: true }
                )
                .exec();

            if (!subscription) 
            {
                throw new NotFoundException(`Subscription not found for Stripe ID: ${stripeSubscriptionId}`);
            }

            return subscription;
        }
        catch (error)
        {
            if (error instanceof NotFoundException) 
            {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Database error while updating subscription status for Stripe ID: ${stripeSubscriptionId} - ${errorMessage}`, error instanceof Error ? error.stack : undefined, 'SubscriptionService#updateStatus');
            throw new DatabaseOperationException('subscription status update', errorMessage);
        }
    }

    async cancelSubscription(userId: Types.ObjectId): Promise<Subscription> 
    {
        this.logger.debug(`Canceling subscription for user: ${userId}`, 'SubscriptionService#cancelSubscription');
        
        const subscription = await this.findByUserId(userId);
        if (!subscription) 
        {
            throw new SubscriptionNotFoundException(userId.toString());
        }

        // Check if subscription can be cancelled
        if (subscription.status === SubscriptionStatus.CANCELED) 
        {
            throw new InvalidSubscriptionOperationException('cancel', subscription.status);
        }

        // Cancel in Stripe (handle missing resources gracefully)
        try 
        {
            await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        }
        catch (error)
        {
            this.logger.error(`Failed to cancel Stripe subscription: ${subscription.stripeSubscriptionId}`, error instanceof Error ? error.stack : undefined, 'SubscriptionService#cancelSubscription');
            
            if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') 
            {
                this.logger.warn(`Stripe subscription ${subscription.stripeSubscriptionId} not found, proceeding with local cancellation`, 'SubscriptionService#cancelSubscription');
            }
            else 
            {
                this.handleStripeError(error, 'subscription cancellation');
            }
        }

        // Update local status
        try 
        {
            subscription.status = SubscriptionStatus.CANCELED;
            subscription.autoRenew = false;
            await subscription.save();
            return subscription;
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Failed to update subscription status to cancelled for user: ${userId} - ${errorMessage}`, error instanceof Error ? error.stack : undefined, 'SubscriptionService#cancelSubscription');
            throw new DatabaseOperationException('subscription status update', errorMessage);
        }
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
        
        try 
        {
            const existingSubscription = await this.findByUserId(userId);
            return !existingSubscription;
        }
        catch (error)
        {
            // If it's a database error, re-throw it
            if (error instanceof DatabaseOperationException) 
            {
                throw error;
            }
            // For other errors, assume not eligible for safety
            this.logger.error(`Error checking trial eligibility for user: ${userId}`, error instanceof Error ? error.stack : undefined, 'SubscriptionService#isEligibleForTrial');
            return false;
        }
    }

    /**
     * Helper method to handle Stripe errors consistently
     */
    private handleStripeError(error: unknown, operation: string): never 
    {
        if (error instanceof Stripe.errors.StripeError) 
        {
            if (error.code === 'rate_limit') 
            {
                throw new StripeServiceUnavailableException();
            }
            
            if (operation.includes('customer')) 
            {
                throw new StripeCustomerException(operation, `${error.type}: ${error.message}`);
            }
            else 
            {
                throw new StripeSubscriptionException(operation, `${error.type}: ${error.message}`);
            }
        }
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown Stripe error';
        if (operation.includes('customer')) 
        {
            throw new StripeCustomerException(operation, errorMessage);
        }
        else 
        {
            throw new StripeSubscriptionException(operation, errorMessage);
        }
    }
}
