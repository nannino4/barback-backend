import { IsEmail, IsMobilePhone, IsNotEmpty, IsStrongPassword, MaxLength, ValidateIf } from "class-validator";

export class RegisterEmailDto
{
    @IsNotEmpty({ message: 'validation.email.required' })
    @IsEmail(undefined, { message: 'validation.email.invalid' })
    @MaxLength(255, { message: 'validation.email.maxLength' })
    email!: string;

    @IsNotEmpty({ message: 'validation.password.required' })
    @MaxLength(20, { message: 'validation.password.maxLength' })
    @IsStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    }, { message: 'validation.password.weak' })
    password!: string;

    @IsNotEmpty({ message: 'validation.firstName.required' })
    @MaxLength(50, { message: 'validation.firstName.maxLength' })
    firstName!: string;

    @IsNotEmpty({ message: 'validation.lastName.required' })
    @MaxLength(50, { message: 'validation.lastName.maxLength' })
    lastName!: string;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty({ message: 'validation.phoneNumber.required' })
    @IsMobilePhone(undefined, {}, { message: 'validation.phoneNumber.invalid' })
    phoneNumber?: string;
}