import { Expose, Type } from 'class-transformer';
import { OutOrgDto } from './out.org.dto';
import { OrgRole } from '../schemas/user-org-relation.schema';
import { OutUserPublicDto } from '../../user/dto/out.user.public.dto';

export class OutUserOrgRelationDto 
{
    @Expose()
    @Type(() => OutUserPublicDto)
    user!: OutUserPublicDto;

    @Expose()
    @Type(() => OutOrgDto)
    org!: OutOrgDto;

    @Expose()
    role!: OrgRole;
}
