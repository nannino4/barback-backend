import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when required email service configuration is missing
 */
export class EmailConfigurationException extends HttpException 
{
    constructor(configKey: string) 
    {
        super(
            {
                error: 'Email Configuration Error',
                message: `Missing required email configuration: ${configKey}`,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            },
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
}

/**
 * Exception thrown when email sending fails
 */
export class EmailSendingException extends HttpException 
{
    constructor(details: string) 
    {
        super(
            {
                error: 'Email Sending Failed',
                message: 'Failed to send email',
                details,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            },
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
}
