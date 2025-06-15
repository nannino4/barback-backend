import { Expose, Transform } from 'class-transformer';
import { OrgRole } from '../../org/schemas/user-org-relation.schema';
import { InvitationStatus } from '../schemas/invitation.schema';

export class OutInvitationDto 
{
    @Expose()
    @Transform(({ obj }) => obj._id.toString())
    id!: string;

    @Expose()
    @Transform(({ obj }) => obj.orgId.toString())
    orgId!: string;

    @Expose()
    invitedEmail!: string;

    @Expose()
    role!: OrgRole;

    @Expose()
    status!: InvitationStatus;

    @Expose()
    @Transform(({ obj }) => obj.invitedBy.toString())
    invitedBy!: string;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;

    @Expose()
    invitationExpires?: Date;
}
