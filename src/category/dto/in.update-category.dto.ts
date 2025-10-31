import { IsString, IsNotEmpty, IsMongoId, ValidateIf } from 'class-validator';

export class InUpdateCategoryDto 
{
    @ValidateIf(o => o.name !== undefined)
    @IsString({ message: 'validation.category.name.mustBeString' })
    @IsNotEmpty({ message: 'validation.category.name.required' })
    name?: string;

    @ValidateIf(o => o.description !== undefined)
    @IsString({ message: 'validation.category.description.mustBeString' })
    @IsNotEmpty({ message: 'validation.category.description.required' })
    description?: string;

    @ValidateIf(o => o.parentId !== undefined)
    @IsMongoId({ message: 'validation.category.parentId.invalidObjectId' })
    parentId?: string;
}
