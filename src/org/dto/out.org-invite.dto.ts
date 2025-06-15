import { Expose, Transform } from 'class-transformer';
import { OrgRole } from '../schemas/user-org-relation.schema';
import { InviteStatus } from '../schemas/org-invite.schema';

export class OutOrgInviteDto 
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

export class OutPendingInvitationDto 
{
    @Expose()
    @Transform(({ obj }) => obj._id.toString())
    id!: string;

    @Expose()
    @Transform(({ obj }) => obj.orgId.toString())
    orgId!: string;

    @Expose()
    role!: OrgRole;

    @Expose()
    status!: InviteStatus;

    @Expose()
    createdAt!: Date;

    @Expose()
    invitationExpires!: Date;

    // Add organization name from populated orgId
    @Expose()
    @Transform(({ obj }) => obj.orgId?.name || 'Unknown Organization')
    organizationName!: string;
}
