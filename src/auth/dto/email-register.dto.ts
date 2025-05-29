import { IsEmail, IsNotEmpty, IsOptional, IsPhoneNumber, IsStrongPassword, MaxLength } from "class-validator";

export class EmailRegisterDto
{
    @IsNotEmpty()
    @IsEmail(undefined, { message: 'Email is not valid.' })
    @MaxLength(255)
    email!: string;

    @IsNotEmpty()
    @MaxLength(20, { message: 'Password cannot exceed 20 characters.' })
    @IsStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    }, { message: 'Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character.' })
    password!: string;

    @IsNotEmpty()
    @MaxLength(50, { message: 'First name cannot exceed 50 characters.' })
    firstName!: string;

    @IsNotEmpty()
    @MaxLength(50, { message: 'Last name cannot exceed 50 characters.' })
    lastName!: string;

    @IsOptional()
    @IsPhoneNumber(undefined, { message: 'Phone number is not valid.' })
    phoneNumber?: string | null;
}