import { Expose, Type, Transform } from 'class-transformer';
import { InventoryLogType } from '../schemas/inventory-log.schema';

export class OutInventoryLogDto 
{
    @Expose()
    @Transform(({ obj }) => obj._id?.toString() || obj.id)
    id!: string;

    @Expose()
    @Transform(({ obj }) => obj.orgId?.toString())
    orgId!: string;

    @Expose()
    @Transform(({ obj }) => obj.productId?.toString())
    productId!: string;

    @Expose()
    @Transform(({ obj }) => obj.userId?.toString())
    userId!: string;

    @Expose()
    type!: InventoryLogType;

    @Expose()
    quantity!: number;

    @Expose()
    previousQuantity!: number;

    @Expose()
    newQuantity!: number;

    @Expose()
    note?: string;

    @Expose()
    @Type(() => Date)
    createdAt!: Date;
}
