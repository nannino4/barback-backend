import { IsString } from 'class-validator';

export class InAddPaymentMethodDto 
{
    @IsString({ message: 'validation.subscription.paymentMethodId.mustBeString' })
    paymentMethodId!: string;
}
