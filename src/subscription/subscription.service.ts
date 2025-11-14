import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { Subscription, SubscriptionStatus } from './schemas/subscription.schema';
import { UserService } from '../user/user.service';
import { StripeService, BillingInterval } from '../common/services/stripe.service';
import { CustomLogger } from '../common/logger/custom.logger';
import { DatabaseOperationException } from '../common/exceptions/database.exceptions';
import { 
    NotEligibleForTrialException,
    SubscriptionNotFoundException,
    SubscriptionNotFoundByIdException,
    InvalidSubscriptionOperationException,
    SubscriptionSetupFailedException,
} from './exceptions/subscription.exceptions';

@Injectable()
export class SubscriptionService 
{
    constructor(
        @InjectModel(Subscription.name) private readonly subscriptionModel: Model<Subscription>,
        private readonly userService: UserService,
        private readonly stripeService: StripeService,
        private readonly logger: CustomLogger,
    ) 
    {
        this.logger.debug('SubscriptionService initialized', 'SubscriptionService#constructor');
    }

    /**
     * Setup subscription for payment collection
     * 
     * Creates a Stripe subscription with payment_behavior='default_incomplete' and returns
     * the clientSecret for Payment Element. Does NOT save to local database yet.
     * 
     * The subscription will be saved locally only after webhook confirms payment success.
     * This prevents accumulation of incomplete subscriptions in our database.
     * 
     * For BOTH trial and paid subscriptions, we collect payment details upfront.
     * This follows Stripe best practices for seamless trial-to-paid conversion.
     * 
     * @param userId User ID
     * @param billingInterval Billing interval (MONTHLY or YEARLY)
     * @param isTrial Whether this is a trial subscription
     * @returns Object containing Stripe subscription ID and clientSecret
     */
    async setupSubscriptionPayment(
        userId: Types.ObjectId,
        billingInterval: BillingInterval = BillingInterval.MONTHLY,
        isTrial: boolean
    ): Promise<{ stripeSubscriptionId: string; clientSecret: string }>
    {
        this.logger.debug(
            `Setting up ${isTrial ? 'trial' : 'paid'} subscription payment for user: ${userId}`,
            'SubscriptionService#setupSubscriptionPayment'
        );

        // If trial requested, ensure eligibility
        if (isTrial)
        {
            const eligible = await this.isEligibleForTrial(userId);
            if (!eligible)
            {
                this.logger.warn(
                    `User ${userId} is not eligible for trial subscription`,
                    'SubscriptionService#setupSubscriptionPayment'
                );
                throw new NotEligibleForTrialException('User already has a subscription or is not eligible for trial');
            }
        }

        // Retrieve user and ensure Stripe customer exists
        const user = await this.userService.findById(userId);
        let stripeCustomerId = user.stripeCustomerId;

        if (!stripeCustomerId)
        {
            const stripeCustomer = await this.stripeService.createCustomer(
                user.email,
                `${user.firstName} ${user.lastName}`
            );
            stripeCustomerId = stripeCustomer.id;
            await this.userService.updateStripeCustomerId(userId, stripeCustomerId);
        }

        // Create subscription in Stripe (both trial and paid collect payment upfront)
        const stripeSubscription = await this.stripeService.createSubscription(
            stripeCustomerId,
            billingInterval,
            { isTrial }
        );

        // Extract clientSecret from latest invoice
        // For incomplete subscriptions, we use confirmation_secret (includes both PaymentIntent and SetupIntent)
        let clientSecret: string | null = null;
        
        if (stripeSubscription.latest_invoice)
        {
            const invoice = stripeSubscription.latest_invoice as Stripe.Invoice;
            
            // Use confirmation_secret which provides a unified client secret
            // This works for both $0 trial invoices (SetupIntent) and paid invoices (PaymentIntent)
            if (invoice.confirmation_secret)
            {
                clientSecret = invoice.confirmation_secret.client_secret || null;
            }
        }

        if (!clientSecret)
        {
            // Cleanup Stripe subscription and throw 500 error (integration failure)
            try
            {
                await this.stripeService.cancelSubscription(stripeSubscription.id);
                this.logger.error(
                    `Missing client secret from Stripe subscription ${stripeSubscription.id}, cancelled subscription`,
                    undefined,
                    'SubscriptionService#setupSubscriptionPayment'
                );
            }
            catch (cleanupError)
            {
                this.logger.error(
                    `Failed to cleanup Stripe subscription ${stripeSubscription.id} after missing client secret`,
                    cleanupError instanceof Error ? cleanupError.stack : undefined,
                    'SubscriptionService#setupSubscriptionPayment'
                );
            }

            throw new SubscriptionSetupFailedException('Client secret not available from Stripe');
        }

        this.logger.debug(
            `${isTrial ? 'Trial' : 'Paid'} subscription setup completed for user: ${userId}, Stripe subscription: ${stripeSubscription.id}`,
            'SubscriptionService#setupSubscriptionPayment'
        );

        // Return Stripe subscription ID and client secret
        // Local DB record will be created by webhook when payment is confirmed
        return { 
            stripeSubscriptionId: stripeSubscription.id,
            clientSecret,
        };
    }

    /**
     * Create local subscription record from Stripe subscription
     * Called by webhook handlers when subscription becomes active/trialing
     * 
     * @param stripeSubscription Stripe subscription object  
     * @param userId User ID (from webhook context)
     * @returns Created subscription
     */
    async createFromStripeSubscription(
        stripeSubscription: Stripe.Subscription,
        userId: Types.ObjectId
    ): Promise<Subscription>
    {
        this.logger.debug(
            `Creating local subscription from Stripe subscription: ${stripeSubscription.id} for user: ${userId}`,
            'SubscriptionService#createFromStripeSubscription'
        );
        
        try
        {
            // Check if subscription already exists
            const existing = await this.subscriptionModel
                .findOne({ stripeSubscriptionId: stripeSubscription.id })
                .exec();

            if (existing)
            {
                this.logger.debug(
                    `Subscription already exists for Stripe subscription ${stripeSubscription.id}, updating status`,
                    'SubscriptionService#createFromStripeSubscription'
                );
                return await this.updateStatus(stripeSubscription.id, this.mapStripeStatusToLocal(stripeSubscription.status));
            }

            const subscription = new this.subscriptionModel({
                userId: userId,
                stripeSubscriptionId: stripeSubscription.id,
                status: this.mapStripeStatusToLocal(stripeSubscription.status),
                autoRenew: true,
            });

            await subscription.save();
            
            this.logger.debug(
                `Local subscription created successfully for Stripe subscription: ${stripeSubscription.id}`,
                'SubscriptionService#createFromStripeSubscription'
            );
            
            return subscription;
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(
                `Database error during subscription creation from Stripe subscription: ${stripeSubscription.id}`,
                error instanceof Error ? error.stack : undefined,
                'SubscriptionService#createFromStripeSubscription'
            );
            throw new DatabaseOperationException('subscription creation from Stripe', errorMessage);
        }
    }

    async findAllByUserId(userId: Types.ObjectId): Promise<Subscription[]> 
    {
        this.logger.debug(`Finding all subscriptions for user: ${userId}`, 'SubscriptionService#findAllByUserId');
        
        try 
        {
            return await this.subscriptionModel
                .find({ userId: userId })
                .sort({ createdAt: -1 }) // Most recent first
                .exec();
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Database error while finding subscriptions for user: ${userId} - ${errorMessage}`, error instanceof Error ? error.stack : undefined, 'SubscriptionService#findAllByUserId');
            throw new DatabaseOperationException('subscription lookup by user ID', errorMessage);
        }
    }

    async findById(id: Types.ObjectId): Promise<Subscription> 
    {
        this.logger.debug(`Finding subscription by ID: ${id}`, 'SubscriptionService#findById');
        
        try 
        {
            const subscription = await this.subscriptionModel
                .findById(id)
                .exec();
            
            if (!subscription) 
            {
                this.logger.warn(`Subscription not found with ID: ${id}`, 'SubscriptionService#findById');
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

    async findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription> 
    {
        this.logger.debug(`Finding subscription by Stripe ID: ${stripeSubscriptionId}`, 'SubscriptionService#findByStripeSubscriptionId');
        
        try 
        {
            const subscription = await this.subscriptionModel
                .findOne({ stripeSubscriptionId })
                .exec();
            
            if (!subscription) 
            {
                this.logger.warn(`Subscription not found with Stripe ID: ${stripeSubscriptionId}`, 'SubscriptionService#findByStripeSubscriptionId');
                throw new SubscriptionNotFoundException(stripeSubscriptionId);
            }
            
            return subscription;
        }
        catch (error)
        {
            if (error instanceof SubscriptionNotFoundException) 
            {
                throw error;
            }
            
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Database error while finding subscription by Stripe ID: ${stripeSubscriptionId} - ${errorMessage}`, error instanceof Error ? error.stack : undefined, 'SubscriptionService#findByStripeSubscriptionId');
            throw new DatabaseOperationException('subscription lookup by Stripe ID', errorMessage);
        }
    }

    async updateStatus(stripeSubscriptionId: string, status: SubscriptionStatus): Promise<Subscription> 
    {
        this.logger.debug(`Updating subscription status: ${stripeSubscriptionId} to ${status}`, 'SubscriptionService#updateStatus');
        
        try 
        {
            const subscription = await this.subscriptionModel
                .findOneAndUpdate(
                    { stripeSubscriptionId: stripeSubscriptionId },
                    { status: status },
                    { new: true }
                )
                .exec();
            
            if (!subscription) 
            {
                this.logger.warn(`Subscription not found with Stripe ID: ${stripeSubscriptionId}`, 'SubscriptionService#updateStatus');
                throw new SubscriptionNotFoundException(stripeSubscriptionId);
            }
            
            this.logger.debug(`Subscription status updated successfully: ${stripeSubscriptionId}`, 'SubscriptionService#updateStatus');
            return subscription;
        }
        catch (error)
        {
            if (error instanceof SubscriptionNotFoundException) 
            {
                throw error;
            }
            
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Database error while updating subscription status: ${stripeSubscriptionId} - ${errorMessage}`, error instanceof Error ? error.stack : undefined, 'SubscriptionService#updateStatus');
            throw new DatabaseOperationException('subscription status update', errorMessage);
        }
    }

    async cancelSubscription(userId: Types.ObjectId, subscriptionId: Types.ObjectId): Promise<Subscription> 
    {
        this.logger.debug(`Cancelling subscription ${subscriptionId} for user: ${userId}`, 'SubscriptionService#cancelSubscription');
        
        // Find specific subscription and verify ownership
        const subscription = await this.findById(subscriptionId);
        
        if (subscription.userId.toString() !== userId.toString()) 
        {
            throw new InvalidSubscriptionOperationException('Subscription ownership mismatch', 'Subscription does not belong to the current user');
        }

        // Cancel subscription in Stripe
        try 
        {
            await this.stripeService.cancelSubscription(subscription.stripeSubscriptionId);
        }
        catch (error)
        {
            this.logger.warn(`Failed to cancel Stripe subscription ${subscription.stripeSubscriptionId}, proceeding with local cancellation`, 'SubscriptionService#cancelSubscription');
        }

        // Update local subscription status
        try 
        {
            return await this.updateStatus(subscription.stripeSubscriptionId, SubscriptionStatus.CANCELED);
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Database error during subscription cancellation for user: ${userId}`, error instanceof Error ? error.stack : undefined, 'SubscriptionService#cancelSubscription');
            throw new DatabaseOperationException('subscription cancellation', errorMessage);
        }
    }

    async syncSubscriptionFromStripe(stripeSubscription: Stripe.Subscription): Promise<void> 
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
            // Log and throw 500 error since this indicates an integration issue
            this.logger.error(
                `Unknown Stripe subscription status: ${stripeStatus}`,
                undefined,
                'SubscriptionService#mapStripeStatusToLocal'
            );
            throw new SubscriptionSetupFailedException(`Unknown Stripe subscription status: ${stripeStatus}`);
        }
    }



    async isEligibleForTrial(userId: Types.ObjectId): Promise<boolean> 
    {
        this.logger.debug(`Checking trial eligibility for user: ${userId}`, 'SubscriptionService#isEligibleForTrial');
        
        try 
        {
            // Check if user has any existing subscriptions
            const existingSubscriptionCount = await this.subscriptionModel
                .countDocuments({ 
                    userId: userId,
                })
                .exec();
            
            // User is eligible for trial only if this is their first subscription
            return existingSubscriptionCount === 0;
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
}
