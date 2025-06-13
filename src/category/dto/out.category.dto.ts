import { Expose, Transform } from 'class-transformer';

export class OutCategoryDto 
{
    @Expose()
    @Transform(({ obj }) => obj._id?.toString() || obj.id)
    id!: string;

    @Expose()
    name!: string;

    @Expose()
    description?: string;

    @Expose()
    @Transform(({ obj }) => obj.parentId?.toString())
    parentId?: string;
}
