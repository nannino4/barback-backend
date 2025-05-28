import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate
{
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean>
    {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractTokenFromHeader(request);

        if (!token)
        {
            throw new UnauthorizedException('No token provided');
        }

        try
        {
            const payload = await this.jwtService.verifyAsync(
                token,
                {
                    secret: this.configService.get<string>('JWT_SECRET'),
                },
            );
            // Assign the payload to the request object
            // so that we can access it in our route handlers
            request['user'] = payload;
        }
        catch (error)
        {
            // Log the error for debugging if needed
            // console.error('JWT Verification Error:', error.message);
            throw new UnauthorizedException('Invalid or expired token');
        }
        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined
    {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
