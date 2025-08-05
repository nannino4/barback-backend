import { 
    BadRequestException,
    UnauthorizedException, 
    ConflictException,
    InternalServerErrorException,
} from '@nestjs/common';

/**
 * Custom exception thrown when Google OAuth configuration is missing or invalid
 */
export class GoogleConfigurationException extends InternalServerErrorException
{
    constructor(missingConfig: string)
    {
        super({
            message: `Google OAuth configuration error: ${missingConfig} is not configured`,
            error: 'GOOGLE_CONFIGURATION_ERROR',
            statusCode: 500,
        });
    }
}

/**
 * Custom exception thrown when Google authorization code exchange fails
 */
export class GoogleTokenExchangeException extends BadRequestException
{
    constructor()
    {
        super({
            message: 'Failed to exchange authorization code for tokens',
            error: 'GOOGLE_TOKEN_EXCHANGE_FAILED',
            statusCode: 400,
        });
    }
}

/**
 * Custom exception thrown when Google user info retrieval fails
 */
export class GoogleUserInfoException extends BadRequestException
{
    constructor()
    {
        super({
            message: 'Failed to fetch user information from Google',
            error: 'GOOGLE_USER_INFO_FAILED',
            statusCode: 400,
        });
    }
}

/**
 * Custom exception thrown when Google access token is invalid or expired
 */
export class GoogleTokenInvalidException extends UnauthorizedException
{
    constructor()
    {
        super({
            message: 'Invalid or expired Google access token',
            error: 'GOOGLE_TOKEN_INVALID',
            statusCode: 401,
        });
    }
}

/**
 * Custom exception thrown when Google account email is not verified
 */
export class GoogleEmailNotVerifiedException extends UnauthorizedException
{
    constructor()
    {
        super({
            message: 'Google account email must be verified',
            error: 'GOOGLE_EMAIL_NOT_VERIFIED',
            statusCode: 401,
        });
    }
}

/**
 * Custom exception thrown when linking Google account fails due to conflicts
 */
export class GoogleAccountLinkingException extends ConflictException
{
    constructor(authProvider: string)
    {
        super({
            message: `An account with this email already exists using ${authProvider} authentication`,
            error: 'GOOGLE_ACCOUNT_LINKING_CONFLICT',
            statusCode: 409,
        });
    }
}

/**
 * Custom exception thrown when OAuth state parameter is invalid
 */
export class InvalidOAuthStateException extends BadRequestException
{
    constructor()
    {
        super({
            message: 'Invalid OAuth state parameter',
            error: 'INVALID_OAUTH_STATE',
            statusCode: 400,
        });
    }
}
