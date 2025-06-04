import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginEmailDto 
{
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(255)
    email!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    @MinLength(8)
    password!: string;
}
