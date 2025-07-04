import { Expose, Transform } from 'class-transformer';
import { OrgSettings } from '../schemas/org.schema';

export class OutOrgDto 
{
    @Expose()
    @Transform(({ obj }) => obj._id?.toString() || obj.id)
    id!: string;

    @Expose()
    name!: string;

    @Expose()
    settings!: OrgSettings;
}
