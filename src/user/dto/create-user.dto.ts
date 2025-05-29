import { IsEmail, IsString, IsOptional, IsEnum, IsBoolean, IsUrl, IsNotEmpty, IsPhoneNumber } from 'class-validator';
import { AuthProvider, UserRole } from '../schemas/user.schema';

export class CreateUserDto
{
    @IsNotEmpty()
    @IsEmail()
    email!: string;

    @IsOptional()
    hashedPassword?: string | null;

    @IsNotEmpty()
    @IsString()
    firstName!: string;

    @IsNotEmpty()
    @IsString()
    lastName!: string;

    @IsOptional()
    @IsPhoneNumber()
    phoneNumber?: string | null;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole | null;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean | null;

    @IsOptional()
    @IsEnum(AuthProvider)
    authProvider?: AuthProvider | null;

    @IsOptional()
    @IsString()
    googleId?: string | null;

    @IsOptional()
    @IsUrl()
    profilePictureUrl?: string | null;

    @IsOptional()
    @IsBoolean()
    isEmailVerified?: boolean | null;
}
