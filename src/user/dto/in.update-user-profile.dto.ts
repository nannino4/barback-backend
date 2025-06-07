import { IsString, MinLength, MaxLength, Matches, ValidateIf, IsNotEmpty } from 'class-validator';

export class UpdateUserProfileDto
{
    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    @IsString()
    @MinLength(1, { message: 'First name cannot be empty' })
    @MaxLength(100, { message: 'First name cannot exceed 100 characters' })
    firstName?: string;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    @IsString()
    @MinLength(1, { message: 'Last name cannot be empty' })
    @MaxLength(100, { message: 'Last name cannot exceed 100 characters' })
    lastName?: string;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    @Matches(/^\+?[1-9][\d\s]{1,14}$/, { message: 'Phone number must be a valid international phone number format' })
    phoneNumber?: string;
}
