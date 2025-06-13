import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum InventoryLogType {
    PURCHASE = 'purchase',
    CONSUMPTION = 'consumption',
    ADJUSTMENT = 'adjustment',
    STOCKTAKE = 'stocktake',
}

@Schema({ timestamps: true, collection: 'inventory_logs' })
export class InventoryLog extends Document 
{
    @Prop({ type: Types.ObjectId, ref: 'Org', required: true })
    orgId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
    productId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId!: Types.ObjectId;

    @Prop({ type: String, enum: Object.values(InventoryLogType), required: true })
    type!: InventoryLogType;

    @Prop({ type: Number, required: true })
    quantity!: number;

    @Prop({ type: Number, required: true, min: 0 })
    previousQuantity!: number;

    @Prop({ type: Number, required: true, min: 0 })
    newQuantity!: number;

    @Prop({ type: String, required: false })
    note?: string;

    // createdAt is handled by timestamps: true - represents when the log entry was created
}

export const InventoryLogSchema = SchemaFactory.createForClass(InventoryLog);

// Define indexes as required by schema.json
InventoryLogSchema.index({ orgId: 1 });
InventoryLogSchema.index({ productId: 1 });
InventoryLogSchema.index({ userId: 1 });
InventoryLogSchema.index({ type: 1 });
InventoryLogSchema.index({ createdAt: 1 });
