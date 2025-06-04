import { IsString } from 'class-validator';

export class SetDefaultPaymentMethodDto 
{
    @IsString()
    paymentMethodId!: string;
}
