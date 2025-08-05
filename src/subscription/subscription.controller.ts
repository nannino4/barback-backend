import { Controller, Get, Post, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/schemas/user.schema';
import { SubscriptionService } from './subscription.service';
import { OutSubscriptionDto } from './dto/out.subscription.dto';
import { OutSubscriptionPlanDto } from './dto/out.subscription-plan.dto';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { plainToInstance } from 'class-transformer';
import { CustomLogger } from '../common/logger/custom.logger';

@Controller('subscription')
export class SubscriptionController 
{
    private readonly stripe: Stripe;

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
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    async getSubscription(@CurrentUser() user: User): Promise<OutSubscriptionDto | null> 
    {
        this.logger.debug(`Getting subscription for user: ${user.id}`, 'SubscriptionController#getSubscription');
        const subscription = await this.subscriptionService.findByUserId(user.id);
        if (!subscription) 
        {
            return null;
        }
        return plainToInstance(OutSubscriptionDto, subscription.toObject(), { excludeExtraneousValues: true });
    }

    @UseGuards(JwtAuthGuard)
    @Post('start-owner-trial')
    async startOwnerTrialSubscription(@CurrentUser() user: User): Promise<OutSubscriptionDto> 
    {
        this.logger.debug(`Starting owner trial subscription for user: ${user.id}`, 'SubscriptionController#startOwnerTrialSubscription');
        const subscription = await this.subscriptionService.createTrialSubscription(user.id);
        return plainToInstance(OutSubscriptionDto, subscription.toObject(), { excludeExtraneousValues: true });
    }

    @UseGuards(JwtAuthGuard)
    @Delete('cancel')
    async cancelSubscription(@CurrentUser() user: User): Promise<OutSubscriptionDto> 
    {
        this.logger.debug(`Canceling subscription for user: ${user.id}`, 'SubscriptionController#cancelSubscription');
        const subscription = await this.subscriptionService.cancelSubscription(user.id);
        return plainToInstance(OutSubscriptionDto, subscription.toObject(), { excludeExtraneousValues: true });
    }

    @Get('plans')
    async getSubscriptionPlans(): Promise<OutSubscriptionPlanDto[]> 
    {
        this.logger.debug('Getting subscription plans', 'SubscriptionController#getSubscriptionPlans');
        const plans = await this.subscriptionService.getSubscriptionPlans();
        return plainToInstance(OutSubscriptionPlanDto, plans, { excludeExtraneousValues: true });
    }

    @UseGuards(JwtAuthGuard)
    @Get('trial-eligibility')
    async checkTrialEligibility(@CurrentUser() user: User): Promise<{ eligible: boolean }> 
    {
        this.logger.debug(`Checking trial eligibility for user: ${user.id}`, 'SubscriptionController#checkTrialEligibility');
        const eligible = await this.subscriptionService.isEligibleForTrial(user.id);
        return { eligible };
    }
}
