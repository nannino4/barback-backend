import { IsString, Length, Matches } from 'class-validator';

export class OrgSettingsDto 
{
    @IsString({ message: 'validation.org.currency.mustBeString' })
    @Length(3, 3, { message: 'validation.org.currency.exactLength' })
    @Matches(/^[A-Z]{3}$/, { message: 'validation.org.currency.invalidFormat' })
    defaultCurrency!: string;
}
