import { IsString, IsNotEmpty, IsObject, ValidateIf } from 'class-validator';
import { OrganizationSettings } from '../schemas/organization.schema';

export class CreateOrganizationDto 
{
    @IsString()
    @IsNotEmpty()
    name!: string;

    @ValidateIf(o => o.settings !== undefined)
    @IsNotEmpty()
    @IsObject()
    settings?: OrganizationSettings;
}
