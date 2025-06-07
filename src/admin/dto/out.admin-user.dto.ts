import { Expose, Transform } from "class-transformer";
import { UserRole, AuthProvider } from "../../user/schemas/user.schema";

export class OutAdminUserDto
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
    profilePictureUrl?: string;
    
    @Expose()
    isEmailVerified!: boolean;
    
    @Expose()
    role!: UserRole;
    
    @Expose()
    isActive!: boolean;
    
    @Expose()
    authProvider!: AuthProvider;
    
    @Expose()
    lastLogin?: Date;
    
    @Expose()
    stripeCustomerId?: string;
    
    @Expose()
    createdAt!: Date;
    
    @Expose()
    updatedAt!: Date;

    // Note: Sensitive fields like hashedPassword, emailVerificationToken, 
    // passwordResetToken, passwordResetExpires, and googleId are intentionally 
    // NOT exposed even for admins to maintain security
}
