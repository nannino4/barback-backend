import { IsEnum } from 'class-validator';
import { OrgRole } from '../schemas/user-org-relation.schema';

export class UpdateMemberRoleDto 
{
    @IsEnum(OrgRole)
    role!: OrgRole;
}
