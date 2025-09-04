import { BadRequestException, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';

/**
 * Custom exception thrown when Stripe API calls fail
 */
export class StripeApiException extends InternalServerErrorException
{
    constructor(operation: string, details?: string)
    {
        super({
            message: `Stripe API operation failed: ${operation}${details ? ` - ${details}` : ''}`,
            error: 'STRIPE_API_FAILED',
            statusCode: 500,
        });
    }
}

/**
 * Custom exception thrown when Stripe configuration is invalid or missing
 */
export class StripeConfigurationException extends InternalServerErrorException
{
    constructor(details: string)
    {
        super({
            message: `Stripe configuration error: ${details}`,
            error: 'STRIPE_CONFIGURATION_ERROR',
            statusCode: 500,
        });
    }
}

/**
 * Custom exception thrown when Stripe customer operations fail
 */
export class StripeCustomerException extends BadRequestException
{
    constructor(operation: string, details?: string)
    {
        super({
            message: `Stripe customer operation failed: ${operation}${details ? ` - ${details}` : ''}`,
            error: 'STRIPE_CUSTOMER_FAILED',
            statusCode: 400,
        });
    }
}

/**
 * Custom exception thrown when Stripe subscription operations fail
 */
export class StripeSubscriptionException extends BadRequestException
{
    constructor(operation: string, details?: string)
    {
        super({
            message: `Stripe subscription operation failed: ${operation}${details ? ` - ${details}` : ''}`,
            error: 'STRIPE_SUBSCRIPTION_FAILED',
            statusCode: 400,
        });
    }
}

/**
 * Custom exception thrown when Stripe payment method operations fail
 */
export class StripePaymentMethodException extends BadRequestException
{
    constructor(operation: string, details?: string)
    {
        super({
            message: `Stripe payment method operation failed: ${operation}${details ? ` - ${details}` : ''}`,
            error: 'STRIPE_PAYMENT_METHOD_FAILED',
            statusCode: 400,
        });
    }
}

/**
 * Custom exception thrown when Stripe service is temporarily unavailable
 */
export class StripeServiceUnavailableException extends ServiceUnavailableException
{
    constructor()
    {
        super({
            message: 'Stripe service is temporarily unavailable. Please try again later.',
            error: 'STRIPE_SERVICE_UNAVAILABLE',
            statusCode: 503,
        });
    }
}
