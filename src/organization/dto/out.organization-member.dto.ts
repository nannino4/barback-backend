import { Expose, Transform } from 'class-transformer';
import { OrgRole, RelationshipStatus } from '../schemas/user-org-relationship.schema';

export class OutOrganizationMemberDto 
{
    @Expose()
    @Transform(({ obj }) => obj._id?.toString() || obj.id?.toString())
    id!: string;

    @Expose()
    @Transform(({ obj }) => obj.userId?.toString())
    userId?: string;

    @Expose()
    @Transform(({ obj }) => obj.organizationId?.toString())
    organizationId!: string;

    @Expose()
    role!: OrgRole;

    @Expose()
    status!: RelationshipStatus;

    @Expose()
    invitedEmail?: string;

    @Expose()
    invitationExpires?: Date;

    @Expose()
    @Transform(({ obj }) => obj.invitedBy?.toString())
    invitedBy?: string;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;

    // User information when populated
    @Expose()
    user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
    };
}
