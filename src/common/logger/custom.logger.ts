import { Injectable, LoggerService, ConsoleLogger, Optional } from '@nestjs/common';
import { CorrelationService } from '../services/correlation.service';

/**
 * Custom logger that automatically includes correlation ID from request context
 * Singleton service that uses request-scoped CorrelationService to get correlation ID
 */
@Injectable()
export class CustomLogger implements LoggerService
{
    private readonly logger: ConsoleLogger;

    constructor(
        @Optional() private readonly correlationService?: CorrelationService,
    )
    {
        this.logger = new ConsoleLogger();
    }

    /**
     * Format message with correlation ID from request context
     * Safely handles cases where correlationService might not be available (non-request contexts)
     */
    private formatMessage(message: any): string
    {
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        
        try
        {
            // Try to get correlation ID from request-scoped service
            const correlationId = this.correlationService?.getCorrelationId();
            return correlationId ? `[${correlationId}] ${messageStr}` : `[-] ${messageStr}`;
        }
        catch (error)
        {
            // If we're not in a request context, correlationService won't be available
            // This is normal for startup logs, background tasks, etc.
            return messageStr;
        }
    }

    /**
     * Log a 'log' level message
     */
    log(message: any, context?: string): void
    {
        this.logger.log(this.formatMessage(message), context);
    }

    /**
     * Log an 'error' level message
     */
    error(message: any, stack?: string, context?: string): void
    {
        this.logger.error(this.formatMessage(message), stack, context);
    }

    /**
     * Log a 'warn' level message
     */
    warn(message: any, context?: string): void
    {
        this.logger.warn(this.formatMessage(message), context);
    }

    /**
     * Log a 'debug' level message
     */
    debug(message: any, context?: string): void
    {
        this.logger.debug(this.formatMessage(message), context);
    }

    /**
     * Log a 'verbose' level message
     */
    verbose(message: any, context?: string): void
    {
        this.logger.verbose(this.formatMessage(message), context);
    }
}
