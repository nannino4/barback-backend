import { IsString, IsOptional, IsPhoneNumber } from 'class-validator';

export class UpdateUserProfileDto
{
    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsPhoneNumber()
    phoneNumber?: string;
}
