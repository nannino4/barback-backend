import { ConflictException, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';

/**
 * Custom exception thrown when user is not eligible for trial subscription
 */
export class NotEligibleForTrialException extends ConflictException
{
    constructor(reason?: string)
    {
        super({
            message: `User is not eligible for trial subscription${reason ? `: ${reason}` : ''}`,
            error: 'NOT_ELIGIBLE_FOR_TRIAL',
            statusCode: 409,
        });
    }
}

/**
 * Custom exception thrown when subscription is not found for a user
 */
export class SubscriptionNotFoundException extends NotFoundException
{
    constructor(userId: string)
    {
        super({
            message: `Subscription not found for user: ${userId}`,
            error: 'SUBSCRIPTION_NOT_FOUND',
            statusCode: 404,
        });
    }
}

/**
 * Custom exception thrown when subscription is not found by ID
 */
export class SubscriptionNotFoundByIdException extends NotFoundException
{
    constructor(subscriptionId: string)
    {
        super({
            message: `Subscription not found with ID: ${subscriptionId}`,
            error: 'SUBSCRIPTION_NOT_FOUND_BY_ID',
            statusCode: 404,
        });
    }
}

/**
 * Custom exception thrown when trying to perform invalid operations on subscription
 */
export class InvalidSubscriptionOperationException extends BadRequestException
{
    constructor(operation: string, currentStatus: string)
    {
        super({
            message: `Cannot ${operation} subscription with status: ${currentStatus}`,
            error: 'INVALID_SUBSCRIPTION_OPERATION',
            statusCode: 400,
        });
    }
}

/**
 * Custom exception thrown when subscription already exists for user
 */
export class SubscriptionAlreadyExistsException extends ConflictException
{
    constructor(userId: string)
    {
        super({
            message: `User ${userId} already has an active subscription`,
            error: 'SUBSCRIPTION_ALREADY_EXISTS',
            statusCode: 409,
        });
    }
}

/**
 * Custom exception thrown when Stripe fails to create subscription with payment setup
 * This is a 500 error because it's a Stripe integration failure, not a client error
 */
export class SubscriptionSetupFailedException extends InternalServerErrorException
{
    constructor(reason: string)
    {
        super({
            message: `Failed to setup subscription for payment: ${reason}`,
            error: 'SUBSCRIPTION_SETUP_FAILED',
            statusCode: 500,
        });
    }
}
