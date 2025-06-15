import { Expose, Transform } from "class-transformer";
import { InvitationStatus } from "../schemas/invitation.schema";
import { OrgRole } from "../../org/schemas/user-org-relation.schema";


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
    status!: InvitationStatus;

    @Expose()
    createdAt!: Date;

    @Expose()
    invitationExpires!: Date;

    // Add organization name from populated orgId
    @Expose()
    @Transform(({ obj }) => obj.orgId?.name || 'Unknown Organization')
    organizationName!: string;
}