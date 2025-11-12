import { Controller, Get, Post, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/guards/email-verified.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/schemas/user.schema';
import { SubscriptionService } from './subscription.service';
import { InCreateSubscriptionDto } from './dto/in.create-subscription.dto';
import { OutSubscriptionDto } from './dto/out.subscription.dto';
import { OutSubscriptionSetupDto } from './dto/out.subscription-setup.dto';
import { plainToInstance } from 'class-transformer';
import { CustomLogger } from '../common/logger/custom.logger';

@Controller('subscriptions')
export class SubscriptionController 
{
    constructor(
        private readonly subscriptionService: SubscriptionService,
        private readonly logger: CustomLogger,
    ) 
    {
        this.logger.debug('SubscriptionController initialized', 'SubscriptionController#constructor');
    }

    @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
    @Get()
    async getAllSubscriptions(@CurrentUser() user: User): Promise<OutSubscriptionDto[]> 
    {
        this.logger.debug(`Getting all subscriptions for user: ${user.id}`, 'SubscriptionController#getAllSubscriptions');
        
        const subscriptions = await this.subscriptionService.findAllByUserId(user.id);
        return plainToInstance(OutSubscriptionDto, subscriptions.map(sub => sub.toObject()), { excludeExtraneousValues: true });
    }

    /**
     * Setup subscription for payment collection
     * 
     * Creates a Stripe subscription and returns clientSecret for Payment Element.
     * Does NOT save subscription locally - that happens via webhook after payment confirmation.
     * Both trial and paid subscriptions collect payment details upfront.
     */
    @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
    @Post()
    async setupSubscriptionPayment(
        @CurrentUser() user: User,
        @Body() createSubscriptionDto: InCreateSubscriptionDto
    ): Promise<OutSubscriptionSetupDto> 
    {
        this.logger.debug(
            `Setting up ${createSubscriptionDto.isTrial ? 'trial' : 'paid'} subscription payment for user: ${user.id}`,
            'SubscriptionController#setupSubscriptionPayment'
        );
        
        const result = await this.subscriptionService.setupSubscriptionPayment(
            user.id,
            createSubscriptionDto.billingInterval,
            createSubscriptionDto.isTrial
        );
        
        return plainToInstance(
            OutSubscriptionSetupDto,
            result,
            { excludeExtraneousValues: true }
        );
    }

    @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
    @Get('trial-eligibility')
    async checkTrialEligibility(@CurrentUser() user: User): Promise<{ eligible: boolean }> 
    {
        this.logger.debug(`Checking trial eligibility for user: ${user.id}`, 'SubscriptionController#checkTrialEligibility');
        
        const eligible = await this.subscriptionService.isEligibleForTrial(user.id);
        return { eligible };
    }
}
