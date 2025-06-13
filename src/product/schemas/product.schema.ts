import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'products' })
export class Product extends Document 
{
    @Prop({ type: Types.ObjectId, ref: 'Org', required: true })
    orgId!: Types.ObjectId;

    @Prop({ type: [Types.ObjectId], ref: 'Category', required: true, default: [] })
    categoryIds!: Types.ObjectId[];

    @Prop({ type: String, required: true })
    name!: string;

    @Prop({ type: String, required: false })
    description?: string;

    @Prop({ type: String, required: false })
    brand?: string;

    @Prop({ type: String, required: true })
    defaultUnit!: string;

    @Prop({ type: Number, required: false, min: 0 })
    defaultPurchasePrice?: number;

    @Prop({ type: Number, required: true, default: 0, min: 0 })
    currentQuantity!: number;

    @Prop({ type: String, required: false })
    imageUrl?: string;

    // createdAt and updatedAt are handled by timestamps: true
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Define indexes as required by schema.json and coding guidelines
ProductSchema.index({ orgId: 1, name: 1 }, { unique: true });
ProductSchema.index({ categoryIds: 1 });
ProductSchema.index({ orgId: 1, currentQuantity: 1 });
