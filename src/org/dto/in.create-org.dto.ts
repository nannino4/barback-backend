import { IsString, IsNotEmpty, IsObject, ValidateIf } from 'class-validator';
import { OrgSettings } from '../schemas/org.schema';

/**
 * DTO for creating an organization with a Stripe subscription ID
 * Used when creating organizations after payment confirmation via Stripe
 */
export class CreateOrgDto 
{
    @IsString({ message: 'validation.org.name.mustBeString' })
    @IsNotEmpty({ message: 'validation.org.name.required' })
    name!: string;

    @IsString({ message: 'validation.org.stripeSubscriptionId.mustBeString' })
    @IsNotEmpty({ message: 'validation.org.stripeSubscriptionId.required' })
    stripeSubscriptionId!: string;

    @ValidateIf(o => o.settings !== undefined)
    @IsNotEmpty({ message: 'validation.org.settings.required' })
    @IsObject({ message: 'validation.org.settings.mustBeObject' })
    settings?: OrgSettings;
}
