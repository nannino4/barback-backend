import { IsEnum } from 'class-validator';
import { OrgRole } from '../schemas/user-org.schema';

export class UpdateUserRoleInOrgDto
{
    @IsEnum(OrgRole)
    role!: OrgRole;
}
