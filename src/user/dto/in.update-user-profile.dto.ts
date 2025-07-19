import { IsString, MinLength, MaxLength, ValidateIf, IsNotEmpty, IsMobilePhone } from 'class-validator';

export class UpdateUserProfileDto
{
    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    firstName?: string;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    lastName?: string;

    @ValidateIf((o, value) => value !== undefined)
    @IsNotEmpty()
    @IsMobilePhone('it-IT', { strictMode: true })
    phoneNumber?: string;

    @ValidateIf((o, value) => value !== undefined)
    @IsString()
    profilePictureUrl?: string;
}
