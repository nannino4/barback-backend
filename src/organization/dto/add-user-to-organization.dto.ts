import { IsMongoId, IsEnum } from 'class-validator';
import { OrganizationRole } from '../schemas/user-organization.schema';

export class AddUserToOrganizationDto
{
    @IsMongoId()
    userId!: string;

    @IsEnum(OrganizationRole)
    role!: OrganizationRole;
}
