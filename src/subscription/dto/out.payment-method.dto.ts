import { Expose, Transform } from 'class-transformer';

export class OutPaymentMethodDto 
{
    @Expose()
    id!: string;

    @Expose()
    type!: string;

    @Expose()
    @Transform(({ obj }) => obj.card ? {
        brand: obj.card.brand,
        last4: obj.card.last4,
        exp_month: obj.card.exp_month,
        exp_year: obj.card.exp_year,
    } : undefined)
    card?: {
        brand: string;
        last4: string;
        exp_month: number;
        exp_year: number;
    };

    @Expose()
    isDefault!: boolean;
}
