import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';

/**
 * Exception thrown when a product is not found
 */
export class ProductNotFoundException extends NotFoundException 
{
    constructor(productId?: string) 
    {
        const message = productId 
            ? `Product with ID "${productId}" not found or does not belong to the organization`
            : 'Product not found or does not belong to the organization';
        
        super({
            message,
            error: 'PRODUCT_NOT_FOUND',
            statusCode: 404,
        });
    }
}

/**
 * Exception thrown when trying to create a product with a name that already exists
 */
export class ProductNameConflictException extends ConflictException 
{
    constructor(name: string) 
    {
        super({
            message: `Product with name "${name}" already exists in this organization`,
            error: 'PRODUCT_NAME_CONFLICT',
            statusCode: 409,
        });
    }
}

/**
 * Exception thrown when trying to assign invalid categories to a product
 */
export class InvalidProductCategoryException extends BadRequestException 
{
    constructor(categoryId: string) 
    {
        super({
            message: `Category with ID "${categoryId}" not found or does not belong to the organization`,
            error: 'INVALID_PRODUCT_CATEGORY',
            statusCode: 400,
        });
    }
}

/**
 * Exception thrown when stock adjustment would result in negative quantity
 */
export class NegativeStockException extends BadRequestException 
{
    constructor(currentQuantity: number, adjustmentQuantity: number) 
    {
        super({
            message: `Stock adjustment would result in negative quantity. Current: ${currentQuantity}, Adjustment: ${adjustmentQuantity}`,
            error: 'NEGATIVE_STOCK_NOT_ALLOWED',
            statusCode: 400,
        });
    }
}

/**
 * Exception thrown when stock adjustment quantity is zero
 */
export class ZeroStockAdjustmentException extends BadRequestException 
{
    constructor() 
    {
        super({
            message: 'Stock adjustment quantity cannot be zero',
            error: 'ZERO_STOCK_ADJUSTMENT',
            statusCode: 400,
        });
    }
}

/**
 * Exception thrown when invalid date range is provided for inventory logs
 */
export class InvalidDateRangeException extends BadRequestException 
{
    constructor(message?: string) 
    {
        const defaultMessage = 'Invalid date range provided. Start date must be before end date.';
        super({
            message: message || defaultMessage,
            error: 'INVALID_DATE_RANGE',
            statusCode: 400,
        });
    }
}
