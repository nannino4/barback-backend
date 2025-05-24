import { IsMongoId, IsEnum } from 'class-validator';
import { OrgRole } from '../schemas/user-org.schema';

export class AddUserToOrgDto
{
    @IsMongoId()
    userId!: string;

    @IsEnum(OrgRole)
    role!: OrgRole;
}
