import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { OrgRole } from '../schemas/user-org-relation.schema';

export class InCreateInvitationDto 
{
    @IsEmail()
    @IsNotEmpty()
    invitedEmail!: string;

    @IsEnum(OrgRole)
    @IsNotEmpty()
    role!: OrgRole;
}
