import { ExceptionFilter, Catch, ArgumentsHost, Injectable, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';

@Injectable()
@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter
{
    private readonly logger = new Logger(ThrottlerExceptionFilter.name);

    catch(exception: ThrottlerException, host: ArgumentsHost): void
    {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();

        // Extract throttle context information if available
        const throttlerContext = this.extractThrottlerContext(exception);

        // Log the rate limit violation
        this.logger.warn(
            `Rate limit exceeded: ${request.method} ${request.url} from IP: ${request.ip}`,
        );

        // Add standard rate limit headers for client feedback
        if (throttlerContext)
        {
            response.setHeader('X-RateLimit-Limit', throttlerContext.limit.toString());
            response.setHeader('X-RateLimit-Remaining', '0');
            response.setHeader('X-RateLimit-Reset', throttlerContext.resetTime.toString());
            response.setHeader('Retry-After', Math.ceil(throttlerContext.ttl / 1000).toString());
        }

        // Return consistent error format
        response.status(429).json({
            statusCode: 429,
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            retryAfter: throttlerContext ? Math.ceil(throttlerContext.ttl / 1000) : undefined,
        });
    }

    /**
     * Extract throttler context from exception
     * The ThrottlerException may contain throttler metadata depending on the version
     */
    private extractThrottlerContext(exception: ThrottlerException): { limit: number; ttl: number; resetTime: number } | null
    {
        try
        {
            // Access the internal context from the exception
            // Note: This is accessing internal structure and may vary by @nestjs/throttler version
            const exceptionResponse = exception.getResponse() as any;
            
            if (exceptionResponse && typeof exceptionResponse === 'object')
            {
                // Try to extract from common response formats
                const limit = exceptionResponse.limit || exceptionResponse.ttl?.limit;
                const ttl = exceptionResponse.ttl || exceptionResponse.ttl?.ttl;
                
                if (limit && ttl)
                {
                    return {
                        limit,
                        ttl,
                        resetTime: Date.now() + ttl,
                    };
                }
            }
            
            // Fallback: return null if we can't extract the info
            return null;
        }
        catch (error)
        {
            // If extraction fails, return null and headers won't be added
            return null;
        }
    }
}
