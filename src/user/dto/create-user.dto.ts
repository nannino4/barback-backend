import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsBoolean, IsUrl } from 'class-validator';
import { AuthProvider, UserRole } from '../schemas/user.schema';

export class CreateUserDto
{
    @IsEmail()
    email!: string;

    @IsOptional() // Made optional as it can be null for Google Auth
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    hashedPassword?: string | null;

    @IsString()
    firstName!: string;

    @IsString()
    lastName!: string;

    @IsOptional()
    @IsString()
    phoneNumber?: string | null;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsEnum(AuthProvider)
    authProvider?: AuthProvider;

    @IsOptional()
    @IsString()
    googleId?: string | null;

    @IsOptional()
    @IsUrl()
    profilePictureUrl?: string | null;

    @IsOptional()
    @IsBoolean()
    isEmailVerified?: boolean;

    // Tokens and expiry dates are typically not part of CreateUserDto,
    // they are set internally by the system.
    // emailVerificationToken?: string | null;
    // passwordResetToken?: string | null;
    // passwordResetExpires?: Date | null;
}
