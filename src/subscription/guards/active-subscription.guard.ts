import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { SubscriptionService } from '../subscription.service';

@Injectable()
export class ActiveSubscriptionGuard implements CanActivate 
{
    private readonly logger = new Logger(ActiveSubscriptionGuard.name);

    constructor(private readonly subscriptionService: SubscriptionService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> 
    {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) 
        {
            this.logger.warn('No user found in request', 'ActiveSubscriptionGuard#canActivate');
            throw new ForbiddenException('User authentication required');
        }

        const hasActiveSubscription = await this.subscriptionService.isSubscriptionActive(user.id);
        
        if (!hasActiveSubscription) 
        {
            this.logger.warn(`User ${user.id} does not have an active subscription`, 'ActiveSubscriptionGuard#canActivate');
            throw new ForbiddenException('Active subscription required');
        }

        return true;
    }
}
