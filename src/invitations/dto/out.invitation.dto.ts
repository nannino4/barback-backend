import { Expose, Transform } from 'class-transformer';
import { OrgRole } from '../schemas/user-org-relation.schema';
import { InviteStatus } from '../schemas/org-invite.schema';

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
    status!: InviteStatus;

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
