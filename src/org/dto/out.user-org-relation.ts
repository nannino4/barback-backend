import { Expose, Type } from 'class-transformer';
import { OutOrgDto } from './out.org.dto';
import { OrgRole } from '../schemas/user-org-relation.schema';

export class OutUserOrgRelationDto 
{
    @Expose()
    @Type(() => OutOrgDto)
    org!: OutOrgDto;

    @Expose()
    role!: OrgRole;
}
