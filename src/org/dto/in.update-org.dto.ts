import { IsString, IsNotEmpty, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrgSettingsDto } from './org-settings.dto';

export class UpdateOrganizationDto 
{
    @ValidateIf(o => o.name !== undefined)
    @IsString({ message: 'validation.org.name.mustBeString' })
    @IsNotEmpty({ message: 'validation.org.name.required' })
    name?: string;

    @ValidateIf(o => o.settings !== undefined)
    @ValidateNested({ message: 'validation.org.settings.invalid' })
    @Type(() => OrgSettingsDto)
    settings?: OrgSettingsDto;
}
