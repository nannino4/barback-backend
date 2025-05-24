import { IsString, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto
{
    @IsOptional()
    @IsString()
    street?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsOptional()
    @IsString()
    postalCode?: string;

    @IsOptional()
    @IsString()
    country?: string;
}

class FiscalDataDto
{
    @IsOptional()
    @IsString()
    companyName?: string;

    @IsOptional()
    @IsString()
    taxId?: string;

    @IsOptional()
    @IsString()
    vatNumber?: string;

    @IsOptional()
    @IsString()
    fiscalCode?: string;

    @IsOptional()
    @IsString()
    legalEntityType?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => AddressDto)
    fiscalAddress?: AddressDto;
}

class OrgSettingsDto
{
    @IsOptional()
    @IsString()
    defaultCurrency?: string;
}

export class CreateOrgDto
{
    @IsString()
    name!: string;

    @IsMongoId()
    ownerId!: string; // Assuming ownerId is a string representation of ObjectId

    @IsOptional()
    @ValidateNested()
    @Type(() => AddressDto)
    address?: AddressDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => FiscalDataDto)
    fiscalData?: FiscalDataDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => OrgSettingsDto)
    settings?: OrgSettingsDto;
}
