import { IsString, IsNotEmpty, IsMongoId, ValidateIf } from 'class-validator';

export class InUpdateCategoryDto 
{
    @ValidateIf(o => o.name !== undefined)
    @IsString()
    @IsNotEmpty()
    name?: string;

    @ValidateIf(o => o.description !== undefined)
    @IsString()
    @IsNotEmpty()
    description?: string;

    @ValidateIf(o => o.parentId !== undefined)
    @IsMongoId()
    parentId?: string;
}
