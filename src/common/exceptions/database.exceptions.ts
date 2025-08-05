import { InternalServerErrorException } from '@nestjs/common';

/**
 * Custom exception thrown when a database operation fails
 */
export class DatabaseOperationException extends InternalServerErrorException
{
    constructor(operation: string, details?: string)
    {
        super({
            message: `Database operation failed: ${operation}${details ? ` - ${details}` : ''}`,
            error: 'DATABASE_OPERATION_FAILED',
            statusCode: 500,
        });
    }
}

/**
 * Custom exception thrown when database connection is not available
 */
export class DatabaseConnectionException extends InternalServerErrorException
{
    constructor()
    {
        super({
            message: 'Database connection is not available',
            error: 'DATABASE_CONNECTION_FAILED',
            statusCode: 500,
        });
    }
}
