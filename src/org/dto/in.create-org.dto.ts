import { IsString, IsNotEmpty, IsObject, ValidateIf, IsMongoId } from 'class-validator';
import { OrgSettings } from '../schemas/org.schema';
import { Types } from 'mongoose';

export class CreateOrgDto 
{
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsMongoId()
    @IsNotEmpty()
    subscriptionId!: Types.ObjectId;

    @ValidateIf(o => o.settings !== undefined)
    @IsNotEmpty()
    @IsObject()
    settings?: OrgSettings;
}
