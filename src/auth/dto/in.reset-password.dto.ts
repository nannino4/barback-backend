import { IsNotEmpty, IsString, IsStrongPassword, MaxLength } from 'class-validator';

export class ResetPasswordDto 
{
    @IsString()
    @IsNotEmpty()
    token!: string;

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
