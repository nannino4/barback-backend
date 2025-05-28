import { IsEmail, IsString, IsOptional, IsEnum, IsBoolean, IsUrl, IsStrongPassword } from 'class-validator';
import { AuthProvider, UserRole } from '../schemas/user.schema';

export class CreateUserDto
{
    @IsEmail()
    email!: string;

    @IsOptional() // Password is now optional
    @IsStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    }, { message: 'Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character.' })
    password?: string; // Renamed and made optional

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
