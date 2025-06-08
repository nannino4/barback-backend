import { IsString } from 'class-validator';

export class InSetDefaultPaymentMethodDto 
{
    @IsString()
    paymentMethodId!: string;
}
