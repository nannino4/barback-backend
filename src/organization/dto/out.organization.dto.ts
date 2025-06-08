import { Expose, Transform } from 'class-transformer';

export class OutOrganizationDto 
{
    @Expose()
    @Transform(({ obj }) => obj._id?.toString() || obj.id?.toString())
    id!: string;

    @Expose()
    name!: string;

    @Expose()
    @Transform(({ obj }) => obj.ownerId?.toString())
    ownerId!: string;

    @Expose()
    @Transform(({ obj }) => obj.subscriptionId?.toString())
    subscriptionId!: string;

    @Expose()
    settings!: { defaultCurrency: string };

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;
}
