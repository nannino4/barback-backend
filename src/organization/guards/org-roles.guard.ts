import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { OrgService } from '../org.service';
import { OrgRole } from '../schemas/user-org-relationship.schema';
import { ORG_ROLES_KEY } from '../decorators/org-roles.decorator';

@Injectable()
export class OrgRolesGuard implements CanActivate 
{
    private readonly logger = new Logger(OrgRolesGuard.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly organizationService: OrgService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> 
    {
        const requiredRoles = this.reflector.getAllAndOverride<OrgRole[]>(ORG_ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) 
        {
            this.logger.debug('No organization roles required for this endpoint', 'OrganizationRolesGuard#canActivate');
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const user = request.user;
        const organizationId = request.params?.organizationId || request.params?.id;

        if (!user) 
        {
            this.logger.warn('User not found in request context', 'OrganizationRolesGuard#canActivate');
            throw new ForbiddenException('User information not available');
        }

        if (!organizationId) 
        {
            this.logger.warn('Organization ID not found in request parameters', 'OrganizationRolesGuard#canActivate');
            throw new ForbiddenException('Organization ID is required');
        }

        try 
        {
            const userRole = await this.organizationService.getUserRoleInOrganization(user.id, organizationId);
            
            if (!userRole) 
            {
                this.logger.warn(`User ${user.email} is not a member of organization ${organizationId}`, 'OrganizationRolesGuard#canActivate');
                throw new ForbiddenException('You are not a member of this organization');
            }

            const hasRole = requiredRoles.includes(userRole);

            if (!hasRole) 
            {
                this.logger.warn(`User ${user.email} with role ${userRole} attempted to access endpoint requiring roles: ${requiredRoles.join(', ')}`, 'OrganizationRolesGuard#canActivate');
                throw new ForbiddenException(`Access denied. Required organization roles: ${requiredRoles.join(', ')}`);
            }

            this.logger.debug(`User ${user.email} with role ${userRole} authorized for organization endpoint`, 'OrganizationRolesGuard#canActivate');
            return true;
        } 
        catch (error: any) 
        {
            if (error instanceof ForbiddenException) 
            {
                throw error;
            }
            this.logger.error(`Error checking organization roles for user ${user.email}: ${error.message}`, 'OrganizationRolesGuard#canActivate');
            throw new ForbiddenException('Error verifying organization permissions');
        }
    }
}
