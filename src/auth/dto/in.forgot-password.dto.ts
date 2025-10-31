import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto 
{
    @IsEmail({}, { message: 'validation.email.invalid' })
    @IsNotEmpty({ message: 'validation.email.required' })
    email!: string;
}
