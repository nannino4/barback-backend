import { Expose, Type, Transform } from 'class-transformer';
import { OrgRole } from '../../org/schemas/user-org-relation.schema';
import { InvitationStatus } from '../schemas/invitation.schema';
import { OutUserPublicDto } from '../../user/dto/out.user.public.dto';
import { OutOrgPublicDto } from '../../org/dto/out.org.public.dto';
import { plainToInstance } from 'class-transformer';

/**
 * Standard invitation DTO with populated organization and inviter information.
 * This is the only invitation DTO - all endpoints return fully populated invitations.
 * Organization managers see who sent each invitation.
 * Invited users see full organization and inviter details.
 */
export class OutInvitationDto 
{
    @Expose()
    @Transform(({ obj }) => obj._id?.toString() || obj.id)
    id!: string;

    @Expose()
    invitedEmail!: string;

    @Expose()
    role!: OrgRole;

    @Expose()
    status!: InvitationStatus;

    @Expose()
    @Type(() => OutUserPublicDto)
    @Transform(({ obj }) => 
    {
        return plainToInstance(OutUserPublicDto, obj.invitedBy, { excludeExtraneousValues: true });
    })
    invitedBy!: OutUserPublicDto;

    @Expose()
    @Type(() => OutOrgPublicDto)
    @Transform(({ obj }) => 
    {
        return plainToInstance(OutOrgPublicDto, obj.orgId, { excludeExtraneousValues: true });
    })
    organization!: OutOrgPublicDto;

    @Expose()
    createdAt!: Date;

    @Expose()
    expiresAt!: Date;
}
