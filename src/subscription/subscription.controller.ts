import { Controller, Get, Post, Delete, UseGuards, Request, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import { OutSubscriptionDto } from './dto/out.subscription.dto';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { plainToClass } from 'class-transformer';

@Controller('subscription')
export class SubscriptionController 
{
    private readonly logger = new Logger(SubscriptionController.name);
    private readonly stripe: Stripe;

    constructor(
        private readonly subscriptionService: SubscriptionService,
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
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    async getSubscription(@Request() req: any): Promise<OutSubscriptionDto | null> 
    {
        this.logger.debug(`Getting subscription for user: ${req.user.id}`, 'SubscriptionController#getSubscription');
        const subscription = await this.subscriptionService.findByUserId(req.user.id);
        if (!subscription) 
        {
            return null;
        }
        return plainToClass(OutSubscriptionDto, subscription.toObject());
    }

    @UseGuards(JwtAuthGuard)
    @Post('start-owner-trial')
    async startOwnerTrialSubscription(@Request() req: any): Promise<OutSubscriptionDto> 
    {
        this.logger.debug(`Starting owner trial subscription for user: ${req.user.id}`, 'SubscriptionController#startOwnerTrialSubscription');
        const subscription = await this.subscriptionService.createTrialSubscription(req.user.id);
        return plainToClass(OutSubscriptionDto, subscription.toObject());
    }

    @UseGuards(JwtAuthGuard)
    @Delete('cancel')
    async cancelSubscription(@Request() req: any): Promise<OutSubscriptionDto> 
    {
        this.logger.debug(`Canceling subscription for user: ${req.user.id}`, 'SubscriptionController#cancelSubscription');
        const subscription = await this.subscriptionService.cancelSubscription(req.user.id);
        return plainToClass(OutSubscriptionDto, subscription.toObject());
    }

    @Get('plans')
    async getSubscriptionPlans() 
    {
        this.logger.debug('Getting subscription plans', 'SubscriptionController#getSubscriptionPlans');
        return this.subscriptionService.getSubscriptionPlans();
    }

    @UseGuards(JwtAuthGuard)
    @Get('trial-eligibility')
    async checkTrialEligibility(@Request() req: any): Promise<{ eligible: boolean }> 
    {
        this.logger.debug(`Checking trial eligibility for user: ${req.user.id}`, 'SubscriptionController#checkTrialEligibility');
        const eligible = await this.subscriptionService.isEligibleForTrial(req.user.id);
        return { eligible };
    }
}
