import { Controller, Get, Post, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/schemas/user.schema';
import { SubscriptionService } from './subscription.service';
import { InCreateSubscriptionDto } from './dto/in.create-subscription.dto';
import { OutSubscriptionDto } from './dto/out.subscription.dto';
import { OutSubscriptionPlanDto } from './dto/out.subscription-plan.dto';
import { plainToInstance } from 'class-transformer';
import { CustomLogger } from '../common/logger/custom.logger';

@Controller('subscription')
export class SubscriptionController 
{
    constructor(
        private readonly subscriptionService: SubscriptionService,
        private readonly logger: CustomLogger,
    ) 
    {
        this.logger.debug('SubscriptionController initialized', 'SubscriptionController#constructor');
    }

    @UseGuards(JwtAuthGuard)
    @Get('all')
    async getAllSubscriptions(@CurrentUser() user: User): Promise<OutSubscriptionDto[]> 
    {
        this.logger.debug(`Getting all subscriptions for user: ${user.id}`, 'SubscriptionController#getAllSubscriptions');
        
        const subscriptions = await this.subscriptionService.findAllByUserId(user.id);
        return plainToInstance(OutSubscriptionDto, subscriptions.map(sub => sub.toObject()), { excludeExtraneousValues: true });
    }

    @UseGuards(JwtAuthGuard)
    @Post('start-trial')
    async startTrialSubscription(
        @CurrentUser() user: User,
        @Body() createSubscriptionDto: InCreateSubscriptionDto
    ): Promise<OutSubscriptionDto> 
    {
        this.logger.debug(`Starting trial subscription for user: ${user.id}`, 'SubscriptionController#startTrialSubscription');
        
        const subscription = await this.subscriptionService.createTrialSubscription(
            user.id, 
            createSubscriptionDto.billingInterval
        );
        return plainToInstance(OutSubscriptionDto, subscription.toObject(), { excludeExtraneousValues: true });
    }

    @UseGuards(JwtAuthGuard)
    @Post('start-paid')
    async startPaidSubscription(
        @CurrentUser() user: User,
        @Body() createSubscriptionDto: InCreateSubscriptionDto
    ): Promise<OutSubscriptionDto> 
    {
        this.logger.debug(`Starting paid subscription for user: ${user.id}`, 'SubscriptionController#startPaidSubscription');
        
        const subscription = await this.subscriptionService.createPaidSubscription(
            user.id,
            createSubscriptionDto.billingInterval
        );
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
