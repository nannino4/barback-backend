import { IsString, IsNotEmpty, IsArray, IsMongoId, IsNumber, IsUrl, Min, ValidateIf } from 'class-validator';

export class InCreateProductDto 
{
    @IsString({ message: 'validation.product.name.mustBeString' })
    @IsNotEmpty({ message: 'validation.product.name.required' })
    name!: string;

    @ValidateIf(o => o.description !== undefined)
    @IsString({ message: 'validation.product.description.mustBeString' })
    @IsNotEmpty({ message: 'validation.product.description.required' })
    description?: string;

    @ValidateIf(o => o.brand !== undefined)
    @IsString({ message: 'validation.product.brand.mustBeString' })
    @IsNotEmpty({ message: 'validation.product.brand.required' })
    brand?: string;

    @IsString({ message: 'validation.product.defaultUnit.mustBeString' })
    @IsNotEmpty({ message: 'validation.product.defaultUnit.required' })
    defaultUnit!: string;

    @ValidateIf(o => o.defaultPurchasePrice !== undefined)
    @IsNumber({}, { message: 'validation.product.defaultPurchasePrice.mustBeNumber' })
    @Min(0, { message: 'validation.product.defaultPurchasePrice.min' })
    defaultPurchasePrice?: number;

    @ValidateIf(o => o.currentQuantity !== undefined)
    @IsNumber({}, { message: 'validation.product.currentQuantity.mustBeNumber' })
    @Min(0, { message: 'validation.product.currentQuantity.min' })
    currentQuantity?: number;

    @ValidateIf(o => o.categoryIds !== undefined)
    @IsArray({ message: 'validation.product.categoryIds.mustBeArray' })
    @IsMongoId({ each: true, message: 'validation.product.categoryIds.invalidObjectId' })
    categoryIds?: string[];

    @ValidateIf(o => o.imageUrl !== undefined)
    @IsUrl({}, { message: 'validation.product.imageUrl.invalidUrl' })
    imageUrl?: string;
}
