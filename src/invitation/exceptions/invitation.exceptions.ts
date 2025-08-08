import { HttpException, HttpStatus, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

/**
 * Exception thrown when an invitation is not found
 */
export class InvitationNotFoundException extends NotFoundException
{
    constructor(identifier?: string)
    {
        const message = identifier 
            ? `Invitation with identifier "${identifier}" not found`
            : 'Invitation not found';
        
        super({
            message,
            error: 'INVITATION_NOT_FOUND',
            statusCode: 404,
        });
    }
}

/**
 * Exception thrown when an invitation token is invalid or expired
 */
export class InvalidInvitationTokenException extends BadRequestException
{
    constructor()
    {
        super({
            message: 'Invalid or expired invitation token',
            error: 'INVALID_INVITATION_TOKEN',
            statusCode: 400,
        });
    }
}

/**
 * Exception thrown when an invitation has already expired
 */
export class InvitationExpiredException extends BadRequestException
{
    constructor()
    {
        super({
            message: 'Invitation has expired',
            error: 'INVITATION_EXPIRED',
            statusCode: 400,
        });
    }
}

/**
 * Exception thrown when trying to create an invitation that already exists
 */
export class InvitationAlreadyExistsException extends ConflictException
{
    constructor(email: string)
    {
        super({
            message: `A pending invitation already exists for email "${email}"`,
            error: 'INVITATION_ALREADY_EXISTS',
            statusCode: 409,
        });
    }
}

/**
 * Exception thrown when an invitation has already been processed (accepted/declined/revoked)
 */
export class InvitationAlreadyProcessedException extends BadRequestException
{
    constructor(status: string)
    {
        super({
            message: `Invitation has already been ${status.toLowerCase()}`,
            error: 'INVITATION_ALREADY_PROCESSED',
            statusCode: 400,
        });
    }
}

/**
 * Exception thrown when trying to invite a user who is already a member
 */
export class UserAlreadyMemberException extends ConflictException
{
    constructor(email: string)
    {
        super({
            message: `User with email "${email}" is already a member of this organization`,
            error: 'USER_ALREADY_MEMBER',
            statusCode: 409,
        });
    }
}

/**
 * Exception thrown when trying to invite someone as owner
 */
export class CannotInviteAsOwnerException extends BadRequestException
{
    constructor()
    {
        super({
            message: 'Cannot invite users as owners. Organizations can only have one owner.',
            error: 'CANNOT_INVITE_AS_OWNER',
            statusCode: 400,
        });
    }
}

/**
 * Exception thrown when invitation email sending fails
 */
export class InvitationEmailFailedException extends HttpException
{
    constructor(email: string, details?: string)
    {
        super(
            {
                message: `Failed to send invitation email to "${email}"`,
                error: 'INVITATION_EMAIL_FAILED',
                details: details || 'Email service unavailable',
                statusCode: 500,
            },
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
}

/**
 * Exception thrown when trying to accept an invitation with mismatched user email
 */
export class InvitationEmailMismatchException extends BadRequestException
{
    constructor()
    {
        super({
            message: 'This invitation was sent to a different email address',
            error: 'INVITATION_EMAIL_MISMATCH',
            statusCode: 400,
        });
    }
}
