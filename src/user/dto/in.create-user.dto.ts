import { IsEmail, IsString, IsEnum, IsBoolean, IsUrl, IsNotEmpty, ValidateIf, IsMobilePhone, MinLength, MaxLength } from 'class-validator';
import { AuthProvider, UserRole } from '../schemas/user.schema';

/**
 * Internal DTO for creating users
 * 
 * This DTO is used internally by the UserService and should not be directly 
 * exposed to public API endpoints. It includes fields that are set by the 
 * service layer (role, authProvider, isEmailVerified, etc.).
 * 
 * For public user registration, use RegisterEmailDto in the auth module.
 * For Google OAuth registration, the GoogleService sets these fields internally.
 */
export class CreateUserDto
{
    @IsNotEmpty()
    @IsEmail()
    email!: string;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    hashedPassword?: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    firstName!: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    lastName!: string;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    @IsMobilePhone()
    phoneNumber?: string;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    @IsEnum(UserRole)
    role?: UserRole;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    @IsBoolean()
    isActive?: boolean;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    @IsEnum(AuthProvider)
    authProvider?: AuthProvider;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    @IsString()
    googleId?: string;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    @IsUrl()
    profilePictureUrl?: string;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    @IsBoolean()
    isEmailVerified?: boolean;
}
