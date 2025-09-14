import { ForbiddenException } from '@nestjs/common';

/**
 * Thrown when an authenticated user attempts to access a resource
 * requiring a verified email address.
 */
export class EmailNotVerifiedException extends ForbiddenException
{
    constructor()
    {
        super({
            message: 'Email must be verified to access this resource.',
            error: 'EMAIL_NOT_VERIFIED',
            statusCode: 403,
        });
    }
}
