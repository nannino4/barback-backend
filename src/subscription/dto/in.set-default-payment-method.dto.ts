import { IsString } from 'class-validator';

export class InSetDefaultPaymentMethodDto 
{
    @IsString({ message: 'validation.subscription.paymentMethodId.mustBeString' })
    paymentMethodId!: string;
}
