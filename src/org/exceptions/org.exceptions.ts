import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

/**
 * Custom exception thrown when an organization is not found by ID
 */
export class OrganizationNotFoundException extends NotFoundException
{
    constructor(orgId: string)
    {
        super({
            message: `Organization with ID "${orgId}" not found`,
            error: 'ORGANIZATION_NOT_FOUND',
            statusCode: 404,
        });
    }
}

/**
 * Custom exception thrown when a user is not a member of an organization
 */
export class UserNotMemberException extends NotFoundException
{
    constructor(userId: string, orgId: string)
    {
        super({
            message: `User "${userId}" is not a member of organization "${orgId}"`,
            error: 'USER_NOT_MEMBER',
            statusCode: 404,
        });
    }
}

/**
 * Custom exception thrown when trying to modify an organization owner's role
 */
export class OwnerRoleModificationException extends BadRequestException
{
    constructor()
    {
        super({
            message: 'Cannot modify the role of an organization owner',
            error: 'OWNER_ROLE_MODIFICATION_NOT_ALLOWED',
            statusCode: 400,
        });
    }
}

/**
 * Custom exception thrown when trying to assign owner role through role updates
 */
export class OwnerRoleAssignmentException extends BadRequestException
{
    constructor()
    {
        super({
            message: 'Cannot assign OWNER role through role updates',
            error: 'OWNER_ROLE_ASSIGNMENT_NOT_ALLOWED',
            statusCode: 400,
        });
    }
}

/**
 * Custom exception thrown when subscription is not active
 */
export class SubscriptionNotActiveException extends ConflictException
{
    constructor(subscriptionId: string)
    {
        super({
            message: `Subscription "${subscriptionId}" is not active`,
            error: 'SUBSCRIPTION_NOT_ACTIVE',
            statusCode: 409,
        });
    }
}

/**
 * Custom exception thrown when subscription doesn't belong to user
 */
export class SubscriptionOwnershipException extends ConflictException
{
    constructor(subscriptionId: string)
    {
        super({
            message: `Subscription "${subscriptionId}" does not belong to the current user`,
            error: 'SUBSCRIPTION_OWNERSHIP_MISMATCH',
            statusCode: 409,
        });
    }
}

/**
 * Custom exception thrown when organization name already exists
 */
export class OrganizationNameExistsException extends ConflictException
{
    constructor(name: string)
    {
        super({
            message: `Organization with name "${name}" already exists`,
            error: 'ORGANIZATION_NAME_EXISTS',
            statusCode: 409,
        });
    }
}

/**
 * Custom exception thrown when user-organization relationship data is corrupted
 */
export class CorruptedUserOrgRelationException extends ConflictException
{
    constructor(relationId: string, missingEntity: 'user' | 'organization')
    {
        super({
            message: `Corrupted relationship "${relationId}": ${missingEntity} not found`,
            error: 'CORRUPTED_USER_ORG_RELATION',
            statusCode: 409,
        });
    }
}
