import { IsString, IsNotEmpty, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrgSettingsDto } from './org-settings.dto';

export class UpdateOrganizationDto 
{
    @ValidateIf(o => o.name !== undefined)
    @IsString()
    @IsNotEmpty()
    name?: string;

    @ValidateIf(o => o.settings !== undefined)
    @ValidateNested()
    @Type(() => OrgSettingsDto)
    settings?: OrgSettingsDto;
}
