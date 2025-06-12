import { IsString, Length, Matches } from 'class-validator';

export class OrgSettingsDto 
{
    @IsString()
    @Length(3, 3, { message: 'Currency code must be exactly 3 characters' })
    @Matches(/^[A-Z]{3}$/, { message: 'Currency code must be 3 uppercase letters (e.g., USD, EUR, GBP)' })
    defaultCurrency!: string;
}
