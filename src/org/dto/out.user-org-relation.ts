import { Expose, Type } from 'class-transformer';
import { OutOrgPublicDto } from './out.org.public.dto';
import { OrgRole } from '../schemas/user-org-relation.schema';
import { OutUserPublicDto } from '../../user/dto/out.user.public.dto';

export class OutUserOrgRelationDto 
{
    @Expose()
    @Type(() => OutUserPublicDto)
    user!: OutUserPublicDto;

    @Expose()
    @Type(() => OutOrgPublicDto)
    org!: OutOrgPublicDto;

    @Expose()
    role!: OrgRole;
}
