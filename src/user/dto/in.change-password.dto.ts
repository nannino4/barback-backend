import { IsString, IsNotEmpty, MaxLength, IsStrongPassword } from 'class-validator';

export class ChangePasswordDto
{
    @IsNotEmpty({ message: 'validation.currentPassword.required' })
    @IsString({ message: 'validation.currentPassword.mustBeString' })
    currentPassword!: string;

    @IsNotEmpty({ message: 'validation.newPassword.required' })
    @MaxLength(20, { message: 'validation.newPassword.maxLength' })
    @IsStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    }, { message: 'validation.newPassword.weak' })
    newPassword!: string;
}
