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
    @Prop({ type: String, required: true })
    email!: string;

    @Prop({ type: String, required: false }) 
    hashedPassword?: string;

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

    @Prop({ type: String, enum: AuthProvider, default: AuthProvider.EMAIL })
    authProvider!: AuthProvider;

    @Prop({ type: String, required: false })
    googleId?: string;

    @Prop({ type: String, required: false })
    profilePictureUrl?: string;

    @Prop({ type: Boolean, default: false })
    isEmailVerified!: boolean;

    @Prop({ type: String, required: false })
    emailVerificationToken?: string;

    @Prop({ type: String, required: false })
    passwordResetToken?: string;

    @Prop({ type: Date, required: false })
    passwordResetExpires?: Date;

    @Prop({ type: String, required: false })
    stripeCustomerId?: string;

    // createdAt and updatedAt are handled by timestamps: true
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ googleId: 1 }, { unique: true, sparse: true });
UserSchema.index({ stripeCustomerId: 1 }, { unique: true, sparse: true });
