import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CustomLogger } from '../logger/custom.logger';
import { 
    StripeConfigurationException, 
    StripeCustomerException, 
    StripeSubscriptionException,
    StripeServiceUnavailableException,
    StripePaymentMethodException,
} from '../exceptions/stripe.exceptions';

export enum BillingInterval {
    MONTHLY = 'monthly',
    YEARLY = 'yearly',
}

@Injectable()
export class StripeService 
{
    private readonly stripe: Stripe;
    private readonly priceIds: {
        basicMonthly: string;
        basicYearly: string;
    };

    constructor(
        private readonly configService: ConfigService,
        private readonly logger: CustomLogger,
    ) 
    {
        const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        if (!stripeSecretKey) 
        {
            this.logger.error('STRIPE_SECRET_KEY is not configured', undefined, 'StripeService#constructor');
            throw new StripeConfigurationException('STRIPE_SECRET_KEY is not configured');
        }

        // Load multiple price IDs for different billing intervals
        const basicMonthlyPriceId = this.configService.get<string>('STRIPE_BASIC_MONTHLY_PRICE_ID');
        const basicYearlyPriceId = this.configService.get<string>('STRIPE_BASIC_YEARLY_PRICE_ID');
        if (!basicMonthlyPriceId) 
        {
            this.logger.error('STRIPE_BASIC_MONTHLY_PRICE_ID is not configured', undefined, 'StripeService#constructor');
            throw new StripeConfigurationException('STRIPE_BASIC_MONTHLY_PRICE_ID is not configured');
        }
        if (!basicYearlyPriceId) 
        {
            this.logger.error('STRIPE_BASIC_YEARLY_PRICE_ID is not configured', undefined, 'StripeService#constructor');
            throw new StripeConfigurationException('STRIPE_BASIC_YEARLY_PRICE_ID is not configured');
        }
        this.priceIds = {
            basicMonthly: basicMonthlyPriceId,
            basicYearly: basicYearlyPriceId,
        };
        
        try 
        {
            this.stripe = new Stripe(stripeSecretKey, {
                apiVersion: '2025-05-28.basil',
            });
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown Stripe initialization error';
            this.logger.error(`Failed to initialize Stripe: ${errorMessage}`, error instanceof Error ? error.stack : undefined, 'StripeService#constructor');
            throw new StripeConfigurationException(`Failed to initialize Stripe: ${errorMessage}`);
        }
        
        this.logger.debug('StripeService initialized', 'StripeService#constructor');
    }

    // Customer Management
    async createCustomer(email: string, name: string): Promise<Stripe.Customer> 
    {
        this.logger.debug(`Creating Stripe customer: ${email}`, 'StripeService#createCustomer');
        
        try 
        {
            const customer = await this.stripe.customers.create({
                email,
                name,
            });
            
            this.logger.debug(`Stripe customer created: ${customer.id}`, 'StripeService#createCustomer');
            return customer;
        }
        catch (error)
        {
            this.logger.error(`Failed to create Stripe customer: ${email}`, error instanceof Error ? error.stack : undefined, 'StripeService#createCustomer');
            this.handleStripeError(error, 'customer creation');
        }
    }

    async updateCustomer(customerId: string, updateData: Stripe.CustomerUpdateParams): Promise<Stripe.Customer> 
    {
        this.logger.debug(`Updating Stripe customer: ${customerId}`, 'StripeService#updateCustomer');
        
        try 
        {
            const customer = await this.stripe.customers.update(customerId, updateData);
            this.logger.debug(`Stripe customer updated: ${customerId}`, 'StripeService#updateCustomer');
            return customer;
        }
        catch (error)
        {
            this.logger.error(`Failed to update Stripe customer: ${customerId}`, error instanceof Error ? error.stack : undefined, 'StripeService#updateCustomer');
            this.handleStripeError(error, 'customer update');
        }
    }

    // Subscription Management
    async createTrialSubscription(customerId: string, billingInterval: BillingInterval = BillingInterval.MONTHLY, trialEnd?: number): Promise<Stripe.Subscription> 
    {
        this.logger.debug(`Creating trial subscription for customer: ${customerId} with ${billingInterval} billing`, 'StripeService#createTrialSubscription');
        
        try 
        {
            const priceId = this.getPriceId(billingInterval);
            const subscriptionParams: Stripe.SubscriptionCreateParams = {
                customer: customerId,
                items: [
                    {
                        price: priceId,
                    },
                ],
                // Ensure the subscription automatically starts billing after trial
                payment_behavior: 'default_incomplete',
                payment_settings: {
                    save_default_payment_method: 'on_subscription',
                },
                expand: ['latest_invoice.payment_intent'],
            };

            if (trialEnd) 
            {
                subscriptionParams.trial_end = trialEnd;
            }
            else 
            {
                // Default 90 days trial
                subscriptionParams.trial_end = Math.floor((Date.now() + (90 * 24 * 60 * 60 * 1000)) / 1000);
            }

            const subscription = await this.stripe.subscriptions.create(subscriptionParams);
            this.logger.debug(`Trial subscription created: ${subscription.id}`, 'StripeService#createTrialSubscription');
            return subscription;
        }
        catch (error)
        {
            this.logger.error(`Failed to create trial subscription for customer: ${customerId}`, error instanceof Error ? error.stack : undefined, 'StripeService#createTrialSubscription');
            this.handleStripeError(error, 'subscription creation');
        }
    }

    async createPaidSubscription(customerId: string, billingInterval: BillingInterval = BillingInterval.MONTHLY): Promise<Stripe.Subscription> 
    {
        this.logger.debug(`Creating paid subscription for customer: ${customerId} with ${billingInterval} billing`, 'StripeService#createPaidSubscription');
        
        try 
        {
            const priceId = this.getPriceId(billingInterval);
            const subscription = await this.stripe.subscriptions.create({
                customer: customerId,
                items: [
                    {
                        price: priceId,
                    },
                ],
                payment_behavior: 'default_incomplete',
                payment_settings: {
                    save_default_payment_method: 'on_subscription',
                },
                expand: ['latest_invoice.payment_intent'],
            });
            
            this.logger.debug(`Paid subscription created: ${subscription.id}`, 'StripeService#createPaidSubscription');
            return subscription;
        }
        catch (error)
        {
            this.logger.error(`Failed to create paid subscription for customer: ${customerId}`, error instanceof Error ? error.stack : undefined, 'StripeService#createPaidSubscription');
            this.handleStripeError(error, 'subscription creation');
        }
    }

    async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> 
    {
        this.logger.debug(`Cancelling subscription: ${subscriptionId}`, 'StripeService#cancelSubscription');
        
        try 
        {
            const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
            this.logger.debug(`Subscription cancelled: ${subscriptionId}`, 'StripeService#cancelSubscription');
            return subscription;
        }
        catch (error)
        {
            this.logger.error(`Failed to cancel subscription: ${subscriptionId}`, error instanceof Error ? error.stack : undefined, 'StripeService#cancelSubscription');
            this.handleStripeError(error, 'subscription cancellation');
        }
    }

    async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> 
    {
        this.logger.debug(`Retrieving subscription: ${subscriptionId}`, 'StripeService#retrieveSubscription');
        
        try 
        {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
            this.logger.debug(`Subscription retrieved: ${subscriptionId}`, 'StripeService#retrieveSubscription');
            return subscription;
        }
        catch (error)
        {
            this.logger.error(`Failed to retrieve subscription: ${subscriptionId}`, error instanceof Error ? error.stack : undefined, 'StripeService#retrieveSubscription');
            this.handleStripeError(error, 'subscription retrieval');
        }
    }

    // Payment Method Management
    async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<Stripe.PaymentMethod> 
    {
        this.logger.debug(`Attaching payment method ${paymentMethodId} to customer: ${customerId}`, 'StripeService#attachPaymentMethod');
        
        try 
        {
            const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
                customer: customerId,
            });
            this.logger.debug(`Payment method attached: ${paymentMethodId}`, 'StripeService#attachPaymentMethod');
            return paymentMethod;
        }
        catch (error)
        {
            this.logger.error(`Failed to attach payment method ${paymentMethodId} to customer: ${customerId}`, error instanceof Error ? error.stack : undefined, 'StripeService#attachPaymentMethod');
            this.handleStripeError(error, 'payment method attachment');
        }
    }

    async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> 
    {
        this.logger.debug(`Detaching payment method: ${paymentMethodId}`, 'StripeService#detachPaymentMethod');
        
        try 
        {
            const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
            this.logger.debug(`Payment method detached: ${paymentMethodId}`, 'StripeService#detachPaymentMethod');
            return paymentMethod;
        }
        catch (error)
        {
            this.logger.error(`Failed to detach payment method: ${paymentMethodId}`, error instanceof Error ? error.stack : undefined, 'StripeService#detachPaymentMethod');
            this.handleStripeError(error, 'payment method detachment');
        }
    }

    async listPaymentMethods(customerId: string, type: Stripe.PaymentMethodListParams.Type = 'card'): Promise<Stripe.PaymentMethod[]> 
    {
        this.logger.debug(`Listing payment methods for customer: ${customerId}`, 'StripeService#listPaymentMethods');
        
        try 
        {
            const paymentMethods = await this.stripe.paymentMethods.list({
                customer: customerId,
                type,
            });
            this.logger.debug(`Found ${paymentMethods.data.length} payment methods for customer: ${customerId}`, 'StripeService#listPaymentMethods');
            return paymentMethods.data;
        }
        catch (error)
        {
            this.logger.error(`Failed to list payment methods for customer: ${customerId}`, error instanceof Error ? error.stack : undefined, 'StripeService#listPaymentMethods');
            this.handleStripeError(error, 'payment method listing');
        }
    }

    async retrievePaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> 
    {
        this.logger.debug(`Retrieving payment method: ${paymentMethodId}`, 'StripeService#retrievePaymentMethod');
        
        try 
        {
            const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
            this.logger.debug(`Payment method retrieved: ${paymentMethodId}`, 'StripeService#retrievePaymentMethod');
            return paymentMethod;
        }
        catch (error)
        {
            this.logger.error(`Failed to retrieve payment method: ${paymentMethodId}`, error instanceof Error ? error.stack : undefined, 'StripeService#retrievePaymentMethod');
            this.handleStripeError(error, 'payment method retrieval');
        }
    }

    async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<Stripe.Customer> 
    {
        this.logger.debug(`Setting default payment method ${paymentMethodId} for customer: ${customerId}`, 'StripeService#setDefaultPaymentMethod');
        
        try 
        {
            const customer = await this.stripe.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });
            this.logger.debug(`Default payment method set for customer: ${customerId}`, 'StripeService#setDefaultPaymentMethod');
            return customer;
        }
        catch (error)
        {
            this.logger.error(`Failed to set default payment method for customer: ${customerId}`, error instanceof Error ? error.stack : undefined, 'StripeService#setDefaultPaymentMethod');
            this.handleStripeError(error, 'default payment method setting');
        }
    }

    // Webhook handling
    constructWebhookEvent(body: string | Buffer, signature: string, secret: string): Stripe.Event 
    {
        try 
        {
            return this.stripe.webhooks.constructEvent(body, signature, secret);
        }
        catch (error)
        {
            this.logger.error('Failed to construct webhook event', error instanceof Error ? error.stack : undefined, 'StripeService#constructWebhookEvent');
            throw error;
        }
    }

    // Utility methods
    getPriceId(billingInterval: BillingInterval): string 
    {
        switch (billingInterval) 
        {
        case BillingInterval.MONTHLY:
            return this.priceIds.basicMonthly;
        case BillingInterval.YEARLY:
            return this.priceIds.basicYearly;
        default:
            this.logger.error(`Invalid billing interval: ${billingInterval}`, undefined, 'StripeService#getPriceId');
            throw new StripeConfigurationException(`Invalid billing interval: ${billingInterval}`);
        }
    }

    getAllPriceIds(): { basicMonthly: string; basicYearly: string } 
    {
        return { ...this.priceIds };
    }

    // Legacy method for backward compatibility - defaults to monthly
    getBasicPlanPriceId(): string 
    {
        return this.priceIds.basicMonthly;
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
            else if (error.type === 'StripeInvalidRequestError') 
            {
                if (operation.includes('customer')) 
                {
                    throw new StripeCustomerException(operation, error.message);
                }
                else if (operation.includes('subscription')) 
                {
                    throw new StripeSubscriptionException(operation, error.message);
                }
                else if (operation.includes('payment')) 
                {
                    throw new StripePaymentMethodException(operation, error.message);
                }
            }
            
            this.logger.error(`Stripe error during ${operation}: ${error.message}`, error.stack, 'StripeService#handleStripeError');
            throw new StripeServiceUnavailableException();
        }
        
        this.logger.error(`Unknown error during ${operation}`, error instanceof Error ? error.stack : undefined, 'StripeService#handleStripeError');
        throw new StripeServiceUnavailableException();
    }

}
