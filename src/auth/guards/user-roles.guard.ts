import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserRole } from '../../user/schemas/user.schema';
import { USER_ROLES_KEY } from '../decorators/user-roles.decorator';
import { CustomLogger } from '../../common/logger/custom.logger';

@Injectable()
export class UserRolesGuard implements CanActivate
{
    constructor(
        private readonly reflector: Reflector,
        private readonly logger: CustomLogger,
    ) {}

    canActivate(context: ExecutionContext): boolean
    {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(USER_ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles)
        {
            this.logger.debug('No roles required for this endpoint', 'UserRolesGuard#canActivate');
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const user = request.user;

        if (!user)
        {
            this.logger.warn('User not found in request context', 'UserRolesGuard#canActivate');
            throw new ForbiddenException('User information not available');
        }

        const hasRole = requiredRoles.some((role) => user.role === role);

        if (!hasRole)
        {
            this.logger.warn(`User ${user.email} with role ${user.role} attempted to access endpoint requiring roles: ${requiredRoles.join(', ')}`, 'UserRolesGuard#canActivate');
            throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
        }

        this.logger.debug(`User ${user.email} with role ${user.role} authorized for endpoint`, 'UserRolesGuard#canActivate');
        return true;
    }
}
