import { IsEmail, IsString, IsEnum, IsBoolean, IsUrl, IsNotEmpty, IsPhoneNumber, ValidateIf } from 'class-validator';
import { AuthProvider, UserRole } from '../schemas/user.schema';

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
    firstName!: string;

    @IsNotEmpty()
    @IsString()
    lastName!: string;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    @IsPhoneNumber()
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
