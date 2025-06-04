import { IsString, IsNotEmpty, MaxLength, IsStrongPassword } from 'class-validator';

export class ChangePasswordDto
{
    @IsNotEmpty()
    @IsString()
    currentPassword!: string;

    @IsNotEmpty()
    @MaxLength(20, { message: 'Password cannot exceed 20 characters.' })
    @IsStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    }, { message: 'Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character.' })
    newPassword!: string;
}
