import { IsString, IsNotEmpty, IsObject, ValidateIf, IsMongoId } from 'class-validator';
import { OrgSettings } from '../schemas/org.schema';
import { Types } from 'mongoose';

export class CreateOrgDto 
{
    @IsString({ message: 'validation.org.name.mustBeString' })
    @IsNotEmpty({ message: 'validation.org.name.required' })
    name!: string;

    @IsMongoId({ message: 'validation.org.subscriptionId.invalidObjectId' })
    @IsNotEmpty({ message: 'validation.org.subscriptionId.required' })
    subscriptionId!: Types.ObjectId;

    @ValidateIf(o => o.settings !== undefined)
    @IsNotEmpty({ message: 'validation.org.settings.required' })
    @IsObject({ message: 'validation.org.settings.mustBeObject' })
    settings?: OrgSettings;
}
