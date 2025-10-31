import { IsString, MinLength, MaxLength, ValidateIf, IsNotEmpty, IsMobilePhone } from 'class-validator';

export class UpdateUserProfileDto
{
    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty({ message: 'validation.firstName.required' })
    @IsString({ message: 'validation.firstName.mustBeString' })
    @MinLength(1, { message: 'validation.firstName.minLength' })
    @MaxLength(100, { message: 'validation.firstName.maxLength' })
    firstName?: string;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty({ message: 'validation.lastName.required' })
    @IsString({ message: 'validation.lastName.mustBeString' })
    @MinLength(1, { message: 'validation.lastName.minLength' })
    @MaxLength(100, { message: 'validation.lastName.maxLength' })
    lastName?: string;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty({ message: 'validation.phoneNumber.required' })
    @IsMobilePhone('it-IT', { strictMode: true }, { message: 'validation.phoneNumber.invalid' })
    phoneNumber?: string;

    @ValidateIf((o, value) => value !== undefined)
    @IsString({ message: 'validation.profilePictureUrl.mustBeString' })
    profilePictureUrl?: string;
}
