import { Expose, Transform } from 'class-transformer';

export class OutProductDto 
{
    @Expose()
    @Transform(({ obj }) => obj._id?.toString() || obj.id)
    id!: string;

    @Expose()
    name!: string;

    @Expose()
    description?: string;

    @Expose()
    brand?: string;

    @Expose()
    defaultUnit!: string;

    @Expose()
    defaultPurchasePrice?: number;

    @Expose()
    currentQuantity!: number;

    @Expose()
    @Transform(({ obj }) => obj.categoryIds?.map((id: any) => id.toString()) || [])
    categoryIds!: string[];

    @Expose()
    imageUrl?: string;

    @Expose()
    createdAt?: Date;

    @Expose()
    updatedAt?: Date;
}
