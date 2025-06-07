import { Expose } from 'class-transformer';

export class OutSubscriptionPlanDto 
{
    @Expose()
    id!: string;

    @Expose()
    name!: string;

    @Expose()
    duration!: string;

    @Expose()
    price!: number;

    @Expose()
    features!: string[];
}
