import { ExceptionFilter, Catch, ArgumentsHost, Injectable } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';
import { CustomLogger } from '../logger/custom.logger';

@Injectable()
@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter
{
    constructor(private readonly logger: CustomLogger) {}

    catch(exception: ThrottlerException, host: ArgumentsHost): void
    {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();

        // Log the rate limit violation
        this.logger.warn(
            `Rate limit exceeded: ${request.method} ${request.url} from IP: ${request.ip}`,
            'ThrottlerExceptionFilter',
        );

        // Return consistent error format
        response.status(429).json({
            statusCode: 429,
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
        });
    }
}
