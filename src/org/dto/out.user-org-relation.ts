import { Expose, Transform } from 'class-transformer';
import { OutOrgDto } from './out.org.dto';
import { OrgRole } from '../schemas/user-org-relation.schema';

export class OutUserOrgRelationDto 
{
    @Expose()
    @Transform(({ obj }) => obj.orgId)
    org!: OutOrgDto;

    @Expose()
    role!: OrgRole;
}
