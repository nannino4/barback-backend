import { Expose, Transform } from 'class-transformer';
import { OrgRole, RelationshipStatus } from '../schemas/user-org-relationship.schema';

export class OutUserInvitationDto 
{
    @Expose()
    @Transform(({ obj }) => obj._id?.toString() || obj.id?.toString())
    id!: string;

    @Expose()
    @Transform(({ obj }) => obj.organizationId?.toString())
    organizationId!: string;

    @Expose()
    role!: OrgRole;

    @Expose()
    status!: RelationshipStatus;

    @Expose()
    invitedEmail!: string;

    @Expose()
    invitationExpires!: Date;

    @Expose()
    @Transform(({ obj }) => obj.invitedBy?.toString())
    invitedBy!: string;

    @Expose()
    createdAt!: Date;

    // Organization information when populated
    @Expose()
    organization?: {
        id: string;
        name: string;
    };

    // Invited by user information when populated
    @Expose()
    inviterUser?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
    };
}
