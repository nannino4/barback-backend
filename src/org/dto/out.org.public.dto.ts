import { Expose, Transform } from 'class-transformer';

export class OutOrgPublicDto 
{
    @Expose()
    @Transform(({ obj }) => obj._id?.toString() || obj.id)
    id!: string;

    @Expose()
    name!: string;
}
