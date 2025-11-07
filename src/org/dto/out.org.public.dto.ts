import { Expose, Transform, Type } from 'class-transformer';
import { OutUserPublicDto } from '../../user/dto/out.user.public.dto';
import { plainToInstance } from 'class-transformer';

export class OutOrgPublicDto 
{
    @Expose()
    @Transform(({ obj }) => obj._id?.toString() || obj.id)
    id!: string;

    @Expose()
    name!: string;

    @Expose()
    @Type(() => OutUserPublicDto)
    @Transform(({ obj }) => 
    {
        return plainToInstance(OutUserPublicDto, obj.ownerId, { excludeExtraneousValues: true });
    })
    owner!: OutUserPublicDto;
}
