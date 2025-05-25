import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum UserRole 
{
    ADMIN = 'admin',
    USER = 'user',
}

export enum AuthProvider 
{
    EMAIL = 'email',
    GOOGLE = 'google',
}

@Schema({ timestamps: true, collection: 'users' })
export class User extends Document 
{
    @Prop({ type: String, required: true, unique: true }) // removed index: true
    email!: string;

    @Prop({ type: String, required: false }) 
    hashedPassword?: string | null;

    @Prop({ type: String, required: true })
    firstName!: string;

    @Prop({ type: String, required: true })
    lastName!: string;

    @Prop({ type: String, required: false, default: null })
    phoneNumber?: string | null;

    @Prop({ type: String, enum: UserRole, default: UserRole.USER })
    role!: UserRole;

    @Prop({ type: Boolean, default: true })
    isActive!: boolean;

    @Prop({ type: Date, required: false, default: null })
    lastLogin?: Date | null;

    @Prop({ type: String, enum: AuthProvider, default: AuthProvider.EMAIL })
    authProvider!: AuthProvider;

    @Prop({ type: String, required: false, unique: true, sparse: true, default: null }) // unique and sparse remain for Mongoose validation layer
    googleId?: string | null;

    @Prop({ type: String, required: false, default: null })
    profilePictureUrl?: string | null;

    @Prop({ type: Boolean, default: false })
    isEmailVerified!: boolean;

    @Prop({ type: String, required: false, default: null })
    emailVerificationToken?: string | null;

    @Prop({ type: String, required: false, default: null })
    passwordResetToken?: string | null;

    @Prop({ type: Date, required: false, default: null })
    passwordResetExpires?: Date | null;

    // createdAt and updatedAt are handled by timestamps: true
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ googleId: 1 }, { unique: true, sparse: true });
