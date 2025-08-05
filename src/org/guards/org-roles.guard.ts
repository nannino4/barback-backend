import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserOrgRelationService } from '../user-org-relation.service';
import { OrgRole } from '../schemas/user-org-relation.schema';
import { ORG_ROLES_KEY } from '../decorators/org-roles.decorator';
import { Types } from 'mongoose';
import { CustomLogger } from '../../common/logger/custom.logger';

@Injectable()
export class OrgRolesGuard implements CanActivate 
{
    constructor(
        private readonly reflector: Reflector,
        private readonly userOrgService: UserOrgRelationService,
        private readonly logger: CustomLogger,
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
        const orgId = request.params?.orgId || request.params?.id;

        if (!user) 
        {
            this.logger.warn('User not found in request context', 'OrganizationRolesGuard#canActivate');
            throw new ForbiddenException('User information not available');
        }

        if (!orgId) 
        {
            this.logger.warn('Organization ID not found in request parameters', 'OrganizationRolesGuard#canActivate');
            throw new ForbiddenException('Organization ID is required');
        }

        try 
        {
            // Validate ObjectId format before proceeding
            if (!Types.ObjectId.isValid(orgId)) 
            {
                this.logger.warn(`Invalid ObjectId format: ${orgId}`, 'OrganizationRolesGuard#canActivate');
                throw new BadRequestException('Invalid organization ID format');
            }

            const userRole = (await this.userOrgService.findOne(user._id as Types.ObjectId, new Types.ObjectId(orgId)))?.orgRole;
            
            if (!userRole) 
            {
                this.logger.warn(`User ${user.email} is not a member of organization ${orgId}`, 'OrganizationRolesGuard#canActivate');
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
            if (error instanceof ForbiddenException || error instanceof BadRequestException) 
            {
                throw error;
            }
            this.logger.error(`Error checking organization roles for user ${user.email}: ${error.message}`, 'OrganizationRolesGuard#canActivate');
            throw new ForbiddenException('Error verifying organization permissions');
        }
    }
}
