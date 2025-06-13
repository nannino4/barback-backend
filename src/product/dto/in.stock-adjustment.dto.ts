import { IsString, IsNotEmpty, IsNumber, IsEnum, ValidateIf } from 'class-validator';
import { InventoryLogType } from '../schemas/inventory-log.schema';

export class InStockAdjustmentDto 
{
    @IsEnum(InventoryLogType)
    type!: InventoryLogType;

    @IsNumber()
    quantity!: number;

    @ValidateIf(o => o.note !== undefined)
    @IsString()
    @IsNotEmpty()
    note?: string;
}
