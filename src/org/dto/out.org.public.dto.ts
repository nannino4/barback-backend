import { Expose, plainToInstance, Transform } from 'class-transformer';
import { OutUserPublicDto } from '../../user/dto/out.user.public.dto';

export class OutOrgPublicDto 
{
    @Expose()
    @Transform(({ obj }) => obj._id?.toString() || obj.id)
    id!: string;

    @Expose()
    name!: string;

    @Expose()
    @Transform(({ obj }) => plainToInstance(OutUserPublicDto, obj.ownerId || obj.owner, { excludeExtraneousValues: true }))
    owner!: OutUserPublicDto;
}
