import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginEmailDto 
{
    @IsEmail({}, { message: 'validation.email.invalid' })
    @IsNotEmpty({ message: 'validation.email.required' })
    @MaxLength(255, { message: 'validation.email.maxLength' })
    email!: string;

    @IsString({ message: 'validation.password.mustBeString' })
    @IsNotEmpty({ message: 'validation.password.required' })
    @MaxLength(20, { message: 'validation.password.maxLength' })
    @MinLength(8, { message: 'validation.password.minLength' })
    password!: string;
}
