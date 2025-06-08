import { Expose, Transform } from 'class-transformer';

export class OutOrgDto 
{
    @Expose()
    @Transform(({ obj }) => obj._id?.toString() || obj.id)
    id!: string;

    @Expose()
    name!: string;
}
