import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { Types } from 'mongoose';
import { SubscriptionService } from '../../subscription/subscription.service';
import { OrgService } from '../org.service';
import { SubscriptionStatus } from '../../subscription/schemas/subscription.schema';
import { CustomLogger } from '../../common/logger/custom.logger';

@Injectable()
export class OrgSubscriptionGuard implements CanActivate 
{
    constructor(
        private readonly subscriptionService: SubscriptionService,
        private readonly orgService: OrgService,
        private readonly logger: CustomLogger,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> 
    {
        const request = context.switchToHttp().getRequest<Request>();
        const user = request.user;
        const orgId = request.params?.orgId || request.params?.id;

        if (!user) 
        {
            this.logger.warn('User not found in request context', 'OrgSubscriptionGuard#canActivate');
            throw new ForbiddenException('User information not available');
        }

        if (!orgId) 
        {
            this.logger.warn('Organization ID not found in request parameters', 'OrgSubscriptionGuard#canActivate');
            throw new ForbiddenException('Organization ID is required');
        }

        try 
        {
            // Validate ObjectId format
            if (!Types.ObjectId.isValid(orgId)) 
            {
                this.logger.warn(`Invalid ObjectId format: ${orgId}`, 'OrgSubscriptionGuard#canActivate');
                throw new BadRequestException('Invalid organization ID format');
            }

            // Get organization
            const org = await this.orgService.findById(new Types.ObjectId(orgId));
            if (!org) 
            {
                this.logger.warn(`Organization not found: ${orgId}`, 'OrgSubscriptionGuard#canActivate');
                throw new ForbiddenException('Organization not found');
            }

            // Check if organization has a subscription
            if (!org.subscriptionId) 
            {
                this.logger.warn(`Organization ${orgId} has no subscription`, 'OrgSubscriptionGuard#canActivate');
                throw new ForbiddenException('Organization has no subscription');
            }

            // Get organization's subscription
            const subscription = await this.subscriptionService.findById(org.subscriptionId);
            if (!subscription) 
            {
                this.logger.warn(`Subscription not found for organization: ${orgId}, subscriptionId: ${org.subscriptionId}`, 'OrgSubscriptionGuard#canActivate');
                throw new ForbiddenException('Organization subscription not found');
            }

            // Check if subscription is active or trialing
            const isActiveSubscription = subscription.status === SubscriptionStatus.ACTIVE || 
                                       subscription.status === SubscriptionStatus.TRIALING;

            if (!isActiveSubscription) 
            {
                this.logger.warn(`Organization ${orgId} has inactive subscription (status: ${subscription.status})`, 'OrgSubscriptionGuard#canActivate');
                throw new ForbiddenException('Organization subscription is not active');
            }

            this.logger.debug(`Organization ${orgId} has active subscription (status: ${subscription.status})`, 'OrgSubscriptionGuard#canActivate');
            return true;
        } 
        catch (error: any) 
        {
            if (error instanceof ForbiddenException || error instanceof BadRequestException) 
            {
                throw error;
            }
            
            this.logger.error(`Error checking organization subscription status for org ${orgId}: ${error.message}`, error.stack, 'OrgSubscriptionGuard#canActivate');
            throw new ForbiddenException('Unable to verify organization subscription status');
        }
    }
}
