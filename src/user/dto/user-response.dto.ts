import { Expose, Transform } from 'class-transformer';
import { UserRole, AuthProvider } from '../schemas/user.schema';

/**
 * User Response DTO with class-transformer decorators
 * Only fields marked with @Expose() will be included in the response
 * Sensitive fields like hashedPassword, tokens, etc. are automatically excluded
 */
export class UserResponseDto
{
    @Expose()
    @Transform(({ obj }) => obj._id?.toString() || obj.id)
    id!: string;

    @Expose()
    email!: string;

    @Expose()
    firstName!: string;

    @Expose()
    lastName!: string;

    @Expose()
    phoneNumber?: string;

    @Expose()
    role!: UserRole;

    @Expose()
    isActive!: boolean;

    @Expose()
    lastLogin?: Date;

    @Expose()
    authProvider!: AuthProvider;

    @Expose()
    profilePictureUrl?: string;

    @Expose()
    isEmailVerified!: boolean;

    @Expose()
    stripeCustomerId?: string;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;
}
