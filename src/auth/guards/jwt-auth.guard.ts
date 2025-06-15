import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { User } from 'src/user/schemas/user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class JwtAuthGuard implements CanActivate
{
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        @InjectModel(User.name) private readonly userModel: Model<User>,
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
                    secret: this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
                },
            );

            if (payload.type !== 'access')
            {
                throw new UnauthorizedException('Invalid token type: Must be an access token');
            }

            // Assign the current user to the request object
            // so that we can access it in our route handlers
            const user = await this.userModel.findById(payload.sub);
            if (!user)
            {
                throw new UnauthorizedException('Invalid or expired token');
            }
            request['user'] = user;
        }
        catch (error)
        {
            // Re-throw UnauthorizedException with specific messages
            if (error instanceof UnauthorizedException)
            {
                throw error;
            }
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
