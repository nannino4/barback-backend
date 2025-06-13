import { IsString, IsNotEmpty, IsMongoId, ValidateIf } from 'class-validator';
import { Types } from 'mongoose';

export class InCreateCategoryDto 
{
    @IsString()
    @IsNotEmpty()
    name!: string;

    @ValidateIf(o => o.description !== undefined)
    @IsString()
    @IsNotEmpty()
    description?: string;

    @ValidateIf(o => o.parentId !== undefined)
    @IsMongoId()
    parentId?: Types.ObjectId;
}
