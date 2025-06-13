import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'categories' })
export class Category extends Document 
{
    @Prop({ type: Types.ObjectId, ref: 'Org', required: true })
    orgId!: Types.ObjectId;

    @Prop({ type: String, required: true })
    name!: string;

    @Prop({ type: String, required: false })
    description?: string;

    @Prop({ type: Types.ObjectId, ref: 'Category', required: false })
    parentId!: Types.ObjectId;

    // createdAt and updatedAt are handled by timestamps: true
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Define indexes as required by coding guidelines
CategorySchema.index({ orgId: 1 });
CategorySchema.index({ parentId: 1 }, { sparse: true });
