import { IsString, IsNotEmpty, IsArray, IsMongoId, IsNumber, IsUrl, Min, ValidateIf } from 'class-validator';

export class InCreateProductDto 
{
    @IsString()
    @IsNotEmpty()
    name!: string;

    @ValidateIf(o => o.description !== undefined)
    @IsString()
    @IsNotEmpty()
    description?: string;

    @ValidateIf(o => o.brand !== undefined)
    @IsString()
    @IsNotEmpty()
    brand?: string;

    @IsString()
    @IsNotEmpty()
    defaultUnit!: string;

    @ValidateIf(o => o.defaultPurchasePrice !== undefined)
    @IsNumber()
    @Min(0)
    defaultPurchasePrice?: number;

    @ValidateIf(o => o.currentQuantity !== undefined)
    @IsNumber()
    @Min(0)
    currentQuantity?: number;

    @ValidateIf(o => o.categoryIds !== undefined)
    @IsArray()
    @IsMongoId({ each: true })
    categoryIds?: string[];

    @ValidateIf(o => o.imageUrl !== undefined)
    @IsUrl()
    imageUrl?: string;
}
