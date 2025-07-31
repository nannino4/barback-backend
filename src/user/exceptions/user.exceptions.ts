import { ConflictException, BadRequestException } from '@nestjs/common';

/**
 * Custom exception thrown when attempting to create a user with an email that already exists
 */
export class EmailAlreadyExistsException extends ConflictException
{
    constructor(email: string)
    {
        super({
            message: `User with email "${email}" already exists`,
            error: 'EMAIL_ALREADY_EXISTS',
            statusCode: 409,
        });
    }
}

/**
 * Custom exception thrown when email verification token is invalid or expired
 */
export class InvalidEmailVerificationTokenException extends BadRequestException
{
    constructor()
    {
        super({
            message: 'Invalid or expired email verification token',
            error: 'INVALID_EMAIL_VERIFICATION_TOKEN',
            statusCode: 400,
        });
    }
}

/**
 * Custom exception thrown when password reset token is invalid or expired
 */
export class InvalidPasswordResetTokenException extends BadRequestException
{
    constructor()
    {
        super({
            message: 'Invalid or expired password reset token',
            error: 'INVALID_PASSWORD_RESET_TOKEN',
            statusCode: 400,
        });
    }
}
