import { IsNotEmpty, IsString, IsStrongPassword, MaxLength } from 'class-validator';

export class ResetPasswordDto 
{
    @IsString({ message: 'validation.token.mustBeString' })
    @IsNotEmpty({ message: 'validation.token.required' })
    token!: string;

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
