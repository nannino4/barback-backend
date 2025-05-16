import { IsEnum } from 'class-validator';
import { OrganizationRole } from '../schemas/user-organization.schema';

export class UpdateUserRoleInOrganizationDto
{
    @IsEnum(OrganizationRole)
    role!: OrganizationRole;
}
