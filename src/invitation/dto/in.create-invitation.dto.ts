import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { OrgRole } from '../../org/schemas/user-org-relation.schema';

export class InCreateInvitationDto 
{
    @IsEmail({}, { message: 'validation.invitation.invitedEmail.invalid' })
    @IsNotEmpty({ message: 'validation.invitation.invitedEmail.required' })
    invitedEmail!: string;

    @IsEnum(OrgRole, { message: 'validation.invitation.role.invalid' })
    @IsNotEmpty({ message: 'validation.invitation.role.required' })
    role!: OrgRole;
}
