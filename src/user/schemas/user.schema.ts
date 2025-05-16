import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum UserRole
{
    ADMIN = 'admin',
    USER = 'user',
}

@Schema({ timestamps: true, collection: 'users' })
export class User extends Document
{
    @Prop({ type: String, required: true, unique: true, index: true })
    email!: string;

    // Password handling (hashing) will be implemented later
    @Prop({ type: String, required: true })
    hashedPassword?: string; // Made optional for now if not set immediately

    @Prop({ type: String, required: true })
    firstName!: string;

    @Prop({ type: String, required: true })
    lastName!: string;

    @Prop({ type: String, required: false })
    phoneNumber?: string;

    @Prop({ type: String, enum: UserRole, default: UserRole.USER })
    role!: UserRole;

    @Prop({ type: Boolean, default: true })
    isActive!: boolean;

    @Prop({ type: Date, required: false })
    lastLogin?: Date;

    // createdAt and updatedAt are handled by timestamps: true
}

export const UserSchema = SchemaFactory.createForClass(User);

// Ensure email index as per schema.json (though @Prop index:true also works)
// UserSchema.index({ email: 1 }, { unique: true }); // This is redundant if using @Prop index:true + unique:true
