import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';

/**
 * Exception thrown when a category is not found
 */
export class CategoryNotFoundException extends NotFoundException 
{
    constructor(categoryId?: string) 
    {
        const message = categoryId 
            ? `Category with ID "${categoryId}" not found or does not belong to the organization`
            : 'Category not found or does not belong to the organization';
        
        super({
            message,
            error: 'CATEGORY_NOT_FOUND',
            statusCode: 404,
        });
    }
}

/**
 * Exception thrown when trying to create a category with a name that already exists
 */
export class CategoryNameConflictException extends ConflictException 
{
    constructor(name: string) 
    {
        super({
            message: `Category with name "${name}" already exists in this organization`,
            error: 'CATEGORY_NAME_CONFLICT',
            statusCode: 409,
        });
    }
}

/**
 * Exception thrown when a parent category is not found or invalid
 */
export class InvalidParentCategoryException extends BadRequestException 
{
    constructor(parentId: string) 
    {
        super({
            message: `Parent category with ID "${parentId}" not found or does not belong to the organization`,
            error: 'INVALID_PARENT_CATEGORY',
            statusCode: 400,
        });
    }
}

/**
 * Exception thrown when trying to create a circular reference in category hierarchy
 */
export class CategoryCircularReferenceException extends BadRequestException 
{
    constructor(message?: string) 
    {
        const defaultMessage = 'Circular reference detected in category hierarchy';
        super({
            message: message || defaultMessage,
            error: 'CATEGORY_CIRCULAR_REFERENCE',
            statusCode: 400,
        });
    }
}

/**
 * Exception thrown when trying to set a category as its own parent
 */
export class CategorySelfParentException extends BadRequestException 
{
    constructor() 
    {
        super({
            message: 'Category cannot be its own parent',
            error: 'CATEGORY_SELF_PARENT',
            statusCode: 400,
        });
    }
}

/**
 * Exception thrown when trying to delete a category that has child categories
 */
export class CategoryHasChildrenException extends BadRequestException 
{
    constructor() 
    {
        super({
            message: 'Cannot delete category with child categories. Please delete or reassign child categories first.',
            error: 'CATEGORY_HAS_CHILDREN',
            statusCode: 400,
        });
    }
}
