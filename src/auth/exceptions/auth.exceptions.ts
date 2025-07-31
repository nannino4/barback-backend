import { 
    UnauthorizedException, 
    InternalServerErrorException,
} from '@nestjs/common';

/**
 * Custom exception thrown when JWT configuration is missing or invalid
 */
export class JwtConfigurationException extends InternalServerErrorException
{
    constructor(missingConfig: string)
    {
        super({
            message: `JWT configuration error: ${missingConfig} is not configured`,
            error: 'JWT_CONFIGURATION_ERROR',
            statusCode: 500,
        });
    }
}

/**
 * Custom exception thrown when JWT token generation fails
 */
export class TokenGenerationException extends InternalServerErrorException
{
    constructor(details: string)
    {
        super({
            message: `Token generation failed: ${details}`,
            error: 'TOKEN_GENERATION_FAILED',
            statusCode: 500,
        });
    }
}

/**
 * Custom exception thrown when refresh token is invalid or expired
 */
export class InvalidRefreshTokenException extends UnauthorizedException
{
    constructor()
    {
        super({
            message: 'Invalid or expired refresh token',
            error: 'INVALID_REFRESH_TOKEN',
            statusCode: 401,
        });
    }
}

/**
 * Custom exception thrown when login credentials are invalid
 */
export class InvalidCredentialsException extends UnauthorizedException
{
    constructor()
    {
        super({
            message: 'Email or password is incorrect',
            error: 'INVALID_CREDENTIALS',
            statusCode: 401,
        });
    }
}

/**
 * Custom exception thrown when user tries to login with wrong auth provider
 */
export class WrongAuthProviderException extends UnauthorizedException
{
    constructor(actualProvider: string)
    {
        super({
            message: `This account uses ${actualProvider} authentication. Please use the correct sign-in method.`,
            error: 'WRONG_AUTH_PROVIDER',
            statusCode: 401,
        });
    }
}

/**
 * Custom exception thrown when bcrypt hashing fails
 */
export class PasswordHashingException extends InternalServerErrorException
{
    constructor()
    {
        super({
            message: 'Password hashing failed',
            error: 'PASSWORD_HASHING_FAILED',
            statusCode: 500,
        });
    }
}

/**
 * Custom exception thrown when email service fails
 */
export class EmailServiceException extends InternalServerErrorException
{
    constructor(originalError: string)
    {
        super({
            message: `Email service error: ${originalError}`,
            error: 'EMAIL_SERVICE_ERROR',
            statusCode: 500,
        });
    }
}
