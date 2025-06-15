import { Expose, Transform } from "class-transformer";
import { InviteStatus } from "../schemas/org-invite.schema";
import { OrgRole } from "../schemas/user-org-relation.schema";


export class OutInvitationPublicDto 
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