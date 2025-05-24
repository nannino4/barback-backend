import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Address
{
    @Prop({ type: String, required: false })
    street?: string;

    @Prop({ type: String, required: false })
    city?: string;

    @Prop({ type: String, required: false })
    state?: string;

    @Prop({ type: String, required: false })
    postalCode?: string;

    @Prop({ type: String, required: false })
    country?: string;
}
export const AddressSchema = SchemaFactory.createForClass(Address);

@Schema()
export class FiscalData
{
    @Prop({ type: String, required: false })
    companyName?: string;

    @Prop({ type: String, required: false })
    taxId?: string;

    @Prop({ type: String, required: false })
    vatNumber?: string;

    @Prop({ type: String, required: false })
    fiscalCode?: string;

    @Prop({ type: String, required: false })
    legalEntityType?: string;

    @Prop({ type: AddressSchema, required: false })
    fiscalAddress?: Address;
}
export const FiscalDataSchema = SchemaFactory.createForClass(FiscalData);

@Schema()
export class OrgSettings
{
    @Prop({ type: String, default: 'EUR' })
    defaultCurrency!: string; // Added ! for definite assignment assertion

    // Add other org-specific settings here
}
export const OrgSettingsSchema = SchemaFactory.createForClass(OrgSettings);

@Schema({ timestamps: true, collection: 'organizations' })
export class Org extends Document
{
    @Prop({ type: String, required: true })
    name!: string; // Added ! for definite assignment assertion

    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    ownerId!: Types.ObjectId; // Added ! for definite assignment assertion

    @Prop({ type: AddressSchema, required: false })
    address?: Address;

    @Prop({ type: FiscalDataSchema, required: false })
    fiscalData?: FiscalData;

    @Prop({ type: OrgSettingsSchema, required: false })
    settings?: OrgSettings;

    // createdAt and updatedAt are handled by timestamps: true
}

export const OrgSchema = SchemaFactory.createForClass(Org);
