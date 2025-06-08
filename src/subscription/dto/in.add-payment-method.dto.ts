import { IsString } from 'class-validator';

export class InAddPaymentMethodDto 
{
    @IsString()
    paymentMethodId!: string;
}
