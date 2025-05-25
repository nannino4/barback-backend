import { IsString, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

    @IsMongoId()
    subscriptionId!: string; // Added subscriptionId

    @IsOptional()
    @ValidateNested()
    @Type(() => OrgSettingsDto)
    settings?: OrgSettingsDto;
}
