import { Expose, Transform } from 'class-transformer';
import { OutUserPublicDto } from 'src/user/dto/out.user.public.dto';
import { OutOrgDto } from './out.org.dto';
import { OrgRole } from '../schemas/user-org-relationship.schema';

export class OutUserOrgRelationshipDto 
{
    @Expose()
    @Transform(({ obj }) => obj.userId)
    user!: OutUserPublicDto;

    @Expose()
    @Transform(({ obj }) => obj.orgId)
    org!: OutOrgDto;

    @Expose()
    role!: OrgRole;
}
