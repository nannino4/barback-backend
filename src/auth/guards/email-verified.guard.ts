import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SKIP_EMAIL_VERIFICATION_KEY } from '../decorators/skip-email-verification.decorator';
import { EmailNotVerifiedException } from '../exceptions/email-verification.exception';
import { CustomLogger } from '../../common/logger/custom.logger';

@Injectable()
export class EmailVerifiedGuard implements CanActivate
{
    constructor(
        private readonly reflector: Reflector,
        private readonly logger: CustomLogger,
    ) {}

    canActivate(context: ExecutionContext): boolean
    {
        const skip = this.reflector.getAllAndOverride<boolean>(SKIP_EMAIL_VERIFICATION_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (skip)
        {
            this.logger.debug('Email verification skipped for endpoint', 'EmailVerifiedGuard#canActivate');
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const user = request.user; // Set by JwtAuthGuard

        // If no user present, treat as public (another guard will handle auth if required)
        if (!user)
        {
            this.logger.debug('No user on request, blocking access', 'EmailVerifiedGuard#canActivate');
            // return true;
            return false; // Changed to false to enforce authentication
        }

        if (!user.isEmailVerified)
        {
            this.logger.warn(`User ${user.email} blocked - email not verified`, 'EmailVerifiedGuard#canActivate');
            throw new EmailNotVerifiedException();
        }

        this.logger.debug(`User ${user.email} email verified`, 'EmailVerifiedGuard#canActivate');
        return true;
    }
}
