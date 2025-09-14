import { UnauthorizedException } from '@nestjs/common';

export class JwtAuthException extends UnauthorizedException 
{
    constructor(message: string = 'Invalid or expired token') 
    {
        super({
            message: message,
            error: 'INVALID_AUTH_TOKEN',
            statusCode: 401,
        });
    }
}
