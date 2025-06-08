import { Expose, Transform } from 'class-transformer';
import { OutUserPublicDto } from 'src/user/dto/out.user.public.dto';
import { OutOrgDto } from './out.org.dto';
import { OrgRole } from '../schemas/user-org-relationship.schema';

export class OutUserOrgRelationshipDto 
{
    @Expose()
    @Transform(({ obj }) => ({
        id: obj.userId?._id?.toString() || obj.userId?.toString() || '',
        email: obj.userId?.email || '',
        firstName: obj.userId?.firstName || '',
        lastName: obj.userId?.lastName || '',
        profilePictureUrl: obj.userId?.profilePictureUrl,
    }))
    user!: OutUserPublicDto;

    @Expose()
    @Transform(({ obj }) => ({
        id: obj.organizationId?._id?.toString() || obj.organizationId?.toString() || '',
        name: obj.organizationId?.name || '',
    }))
    org!: OutOrgDto;

    @Expose()
    role!: OrgRole;
}
