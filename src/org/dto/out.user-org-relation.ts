import { Expose, Type, Transform } from 'class-transformer';
import { OutOrgPublicDto } from './out.org.public.dto';
import { OrgRole } from '../schemas/user-org-relation.schema';
import { OutUserPublicDto } from '../../user/dto/out.user.public.dto';
import { plainToInstance } from 'class-transformer';

export class OutUserOrgRelationDto 
{
    @Expose()
    @Type(() => OutUserPublicDto)
    @Transform(({ obj }) => 
    {
        return plainToInstance(OutUserPublicDto, obj.userId, { excludeExtraneousValues: true });
    })
    user!: OutUserPublicDto;

    @Expose()
    @Type(() => OutOrgPublicDto)
    @Transform(({ obj }) => 
    {
        return plainToInstance(OutOrgPublicDto, obj.orgId, { excludeExtraneousValues: true });
    })
    org!: OutOrgPublicDto;

    @Expose()
    @Transform(({ obj }) => obj.orgRole)
    role!: OrgRole;
}
