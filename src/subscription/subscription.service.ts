import { Injectable, BadRequestException } from '@nestjs/common';
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

    async createTrialSubscription(userId: Types.ObjectId, billingInterval: BillingInterval = BillingInterval.MONTHLY): Promise<Subscription> 
    {
        this.logger.debug(`Creating trial subscription for user: ${userId} with ${billingInterval} billing`, 'SubscriptionService#createTrialSubscription');
        
        // Check if user is eligible for trial
        const isEligible = await this.isEligibleForTrial(userId);
        if (!isEligible) 
        {
            this.logger.warn(`User ${userId} is not eligible for trial subscription`, 'SubscriptionService#createTrialSubscription');
            throw new NotEligibleForTrialException('User already has a trial subscription or is not eligible for trial');
        }

        // Get user to create/update Stripe customer
        const user = await this.userService.findById(userId);
        let stripeCustomerId = user.stripeCustomerId;

        // Create Stripe customer if needed
        if (!stripeCustomerId) 
        {
            const stripeCustomer = await this.stripeService.createCustomer(
                user.email,
                `${user.firstName} ${user.lastName}`
            );
            stripeCustomerId = stripeCustomer.id;
            
            // Update user with Stripe customer ID
            await this.userService.updateStripeCustomerId(userId, stripeCustomerId);
        }

        // Create trial subscription in Stripe
        const stripeSubscription = await this.stripeService.createTrialSubscription(stripeCustomerId, billingInterval);

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
            this.logger.debug(`Trial subscription created successfully for user: ${userId}`, 'SubscriptionService#createTrialSubscription');
            return subscription;
        }
        catch (error)
        {
            // If database save fails, cleanup Stripe subscription
            try 
            {
                await this.stripeService.cancelSubscription(stripeSubscription.id);
                this.logger.debug(`Cleaned up Stripe subscription ${stripeSubscription.id} after database failure`, 'SubscriptionService#createTrialSubscription');
            }
            catch (cleanupError)
            {
                this.logger.error(`Failed to cleanup Stripe subscription ${stripeSubscription.id} after database failure`, cleanupError instanceof Error ? cleanupError.stack : undefined, 'SubscriptionService#createTrialSubscription');
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Database error during trial subscription creation for user: ${userId}`, error instanceof Error ? error.stack : undefined, 'SubscriptionService#createTrialSubscription');
            throw new DatabaseOperationException('subscription creation', errorMessage);
        }
    }

    async createPaidSubscription(userId: Types.ObjectId, billingInterval: BillingInterval = BillingInterval.MONTHLY): Promise<Subscription> 
    {
        this.logger.debug(`Creating paid subscription for user: ${userId} with ${billingInterval} billing`, 'SubscriptionService#createPaidSubscription');

        // Get user to create/update Stripe customer
        const user = await this.userService.findById(userId);
        let stripeCustomerId = user.stripeCustomerId;

        // Create Stripe customer if needed
        if (!stripeCustomerId) 
        {
            const stripeCustomer = await this.stripeService.createCustomer(
                user.email,
                `${user.firstName} ${user.lastName}`
            );
            stripeCustomerId = stripeCustomer.id;
            
            // Update user with Stripe customer ID
            await this.userService.updateStripeCustomerId(userId, stripeCustomerId);
        }

        // Create paid subscription in Stripe
        const stripeSubscription = await this.stripeService.createPaidSubscription(stripeCustomerId, billingInterval);

        // Create subscription record in database
        try 
        {
            const subscription = new this.subscriptionModel({
                userId: userId,
                stripeSubscriptionId: stripeSubscription.id,
                status: this.mapStripeStatusToLocal(stripeSubscription.status),
                autoRenew: true,
            });

            await subscription.save();
            this.logger.debug(`Paid subscription created successfully for user: ${userId}`, 'SubscriptionService#createPaidSubscription');
            return subscription;
        }
        catch (error)
        {
            // If database save fails, cleanup Stripe subscription
            try 
            {
                await this.stripeService.cancelSubscription(stripeSubscription.id);
                this.logger.debug(`Cleaned up Stripe subscription ${stripeSubscription.id} after database failure`, 'SubscriptionService#createPaidSubscription');
            }
            catch (cleanupError)
            {
                this.logger.error(`Failed to cleanup Stripe subscription ${stripeSubscription.id} after database failure`, cleanupError instanceof Error ? cleanupError.stack : undefined, 'SubscriptionService#createPaidSubscription');
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Database error during paid subscription creation for user: ${userId}`, error instanceof Error ? error.stack : undefined, 'SubscriptionService#createPaidSubscription');
            throw new DatabaseOperationException('subscription creation', errorMessage);
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
