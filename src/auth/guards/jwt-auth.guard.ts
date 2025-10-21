import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { User } from 'src/user/schemas/user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { JwtAuthException } from '../exceptions/jwt-auth.exception';
import { CustomLogger } from '../../common/logger/custom.logger';

@Injectable()
export class JwtAuthGuard implements CanActivate
{
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        @InjectModel(User.name) private readonly userModel: Model<User>,
        private readonly logger: CustomLogger,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean>
    {
        this.logger.debug('Validating JWT token', 'JwtAuthGuard#canActivate');
        
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractTokenFromHeader(request);

        if (!token)
        {
            this.logger.warn('No token provided in request', 'JwtAuthGuard#canActivate');
            throw new JwtAuthException('No token provided');
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
                this.logger.warn(`Invalid token type: ${payload.type}`, 'JwtAuthGuard#canActivate');
                throw new JwtAuthException('Invalid token type: Must be an access token');
            }

            // Assign the current user to the request object
            // so that we can access it in our route handlers
            const user = await this.userModel.findById(payload.sub);
            if (!user)
            {
                this.logger.warn(`User not found for token subject: ${payload.sub}`, 'JwtAuthGuard#canActivate');
                throw new JwtAuthException('Invalid or expired token');
            }
            
            request['user'] = user;
            this.logger.debug(`User ${user.email} authenticated successfully`, 'JwtAuthGuard#canActivate');
        }
        catch (error)
        {
            // Re-throw JwtAuthException with specific messages
            if (error instanceof JwtAuthException)
            {
                throw error;
            }
            
            // Log the error for debugging
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`JWT verification failed: ${errorMessage}`, errorStack, 'JwtAuthGuard#canActivate');
            throw new JwtAuthException('Invalid or expired token');
        }
        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined
    {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
