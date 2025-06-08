import { IsString, IsNotEmpty, IsObject, ValidateIf } from 'class-validator';
import { OrganizationSettings } from '../schemas/organization.schema';

export class UpdateOrganizationDto 
{
    @ValidateIf(o => o.name !== undefined)
    @IsString()
    @IsNotEmpty()
    name?: string;

    @ValidateIf(o => o.settings !== undefined)
    @IsNotEmpty()
    @IsObject()
    settings?: OrganizationSettings;
}
