import { IsString, IsNotEmpty, MaxLength, IsStrongPassword } from 'class-validator';

export class ChangePasswordDto
{
    @IsNotEmpty()
    @IsString()
    currentPassword!: string;

    @IsNotEmpty()
    @MaxLength(20)
    @IsStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    })
    newPassword!: string;
}
