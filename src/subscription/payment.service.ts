import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import Stripe from 'stripe';
import { UserService } from '../user/user.service';

@Injectable()
export class PaymentService 
{
    private readonly logger = new Logger(PaymentService.name);
    private readonly stripe: Stripe;

    constructor(
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
        
        this.logger.debug('PaymentService initialized', 'PaymentService#constructor');
    }

    async addPaymentMethod(userId: Types.ObjectId, paymentMethodId: string): Promise<Stripe.PaymentMethod> 
    {
        this.logger.debug(`Adding payment method for user: ${userId}`, 'PaymentService#addPaymentMethod');
        
        const user = await this.userService.findById(userId);
        let stripeCustomerId = user.stripeCustomerId;

        // Create Stripe customer if it doesn't exist
        if (!stripeCustomerId) 
        {
            const stripeCustomer = await this.stripe.customers.create({
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
            });
            stripeCustomerId = stripeCustomer.id;
            await this.userService.updateStripeCustomerId(userId, stripeCustomerId);
        }

        // Attach payment method to customer
        const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
            customer: stripeCustomerId,
        });

        this.logger.debug(`Payment method added successfully for user: ${userId}`, 'PaymentService#addPaymentMethod');
        return paymentMethod;
    }

    async getPaymentMethods(userId: Types.ObjectId): Promise<Stripe.PaymentMethod[]> 
    {
        this.logger.debug(`Getting payment methods for user: ${userId}`, 'PaymentService#getPaymentMethods');
        
        const user = await this.userService.findById(userId);
        if (!user.stripeCustomerId) 
        {
            return [];
        }

        const paymentMethods = await this.stripe.paymentMethods.list({
            customer: user.stripeCustomerId,
            type: 'card',
        });

        return paymentMethods.data;
    }

    async removePaymentMethod(userId: Types.ObjectId, paymentMethodId: string): Promise<void> 
    {
        this.logger.debug(`Removing payment method ${paymentMethodId} for user: ${userId}`, 'PaymentService#removePaymentMethod');
        
        const user = await this.userService.findById(userId);
        if (!user.stripeCustomerId) 
        {
            throw new NotFoundException('Customer not found');
        }

        // Verify the payment method belongs to the user
        const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
        if (paymentMethod.customer !== user.stripeCustomerId) 
        {
            throw new BadRequestException('Payment method does not belong to user');
        }

        await this.stripe.paymentMethods.detach(paymentMethodId);
        this.logger.debug(`Payment method removed successfully for user: ${userId}`, 'PaymentService#removePaymentMethod');
    }

    async setDefaultPaymentMethod(userId: Types.ObjectId, paymentMethodId: string): Promise<void> 
    {
        this.logger.debug(`Setting default payment method ${paymentMethodId} for user: ${userId}`, 'PaymentService#setDefaultPaymentMethod');
        
        const user = await this.userService.findById(userId);
        if (!user.stripeCustomerId) 
        {
            throw new NotFoundException('Customer not found');
        }

        // Verify the payment method belongs to the user
        const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
        if (paymentMethod.customer !== user.stripeCustomerId) 
        {
            throw new BadRequestException('Payment method does not belong to user');
        }

        await this.stripe.customers.update(user.stripeCustomerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });

        this.logger.debug(`Default payment method set successfully for user: ${userId}`, 'PaymentService#setDefaultPaymentMethod');
    }
}
