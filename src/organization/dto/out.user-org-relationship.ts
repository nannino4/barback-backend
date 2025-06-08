import { Expose } from 'class-transformer';
import { OutUserPublicDto } from 'src/user/dto/out.user.public.dto';
import { OutOrgDto } from './out.org.dto';
import { OrgRole } from '../schemas/user-org-relationship.schema';

export class OutUserOrgRelationshipDto 
{
    @Expose()
    user!: OutUserPublicDto;

    @Expose()
    org!: OutOrgDto;

    @Expose()
    role!: OrgRole;
}
