import { IsString, IsNotEmpty, IsNumber, IsEnum, ValidateIf } from 'class-validator';
import { InventoryLogType } from '../schemas/inventory-log.schema';

export class InStockAdjustmentDto 
{
    @IsEnum(InventoryLogType, { message: 'validation.inventory.type.invalid' })
    type!: InventoryLogType;

    @IsNumber({}, { message: 'validation.inventory.quantity.mustBeNumber' })
    quantity!: number;

    @ValidateIf(o => o.note !== undefined)
    @IsString({ message: 'validation.inventory.note.mustBeString' })
    @IsNotEmpty({ message: 'validation.inventory.note.required' })
    note?: string;
}
