import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

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
 * Custom exception thrown when a user is not found by email
 */
export class UserNotFoundByEmailException extends NotFoundException
{
    constructor(email: string)
    {
        super({
            message: `User with email "${email}" not found`,
            error: 'USER_NOT_FOUND_BY_EMAIL',
            statusCode: 404,
        });
    }
}

/**
 * Custom exception thrown when a user is not found by ID
 */
export class UserNotFoundByIdException extends NotFoundException
{
    constructor(userId: string)
    {
        super({
            message: `User with ID "${userId}" not found`,
            error: 'USER_NOT_FOUND_BY_ID',
            statusCode: 404,
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

/**
 * Custom exception thrown when email is already verified
 */
export class EmailAlreadyVerifiedException extends BadRequestException
{
    constructor(email: string)
    {
        super({
            message: `Email "${email}" is already verified`,
            error: 'EMAIL_ALREADY_VERIFIED',
            statusCode: 400,
        });
    }
}
