import { IsEmail, IsNotEmpty, IsPhoneNumber, IsStrongPassword, MaxLength, ValidateIf } from "class-validator";

export class RegisterEmailDto
{
    @IsNotEmpty()
    @IsEmail(undefined)
    @MaxLength(255)
    email!: string;

    @IsNotEmpty()
    @MaxLength(20)
    @IsStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    })
    password!: string;

    @IsNotEmpty()
    @MaxLength(50)
    firstName!: string;

    @IsNotEmpty()
    @MaxLength(50)
    lastName!: string;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    @IsPhoneNumber()
    phoneNumber?: string;
}