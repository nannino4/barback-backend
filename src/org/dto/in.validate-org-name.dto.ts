import { IsString, IsNotEmpty } from 'class-validator';

export class ValidateOrgNameDto 
{
    @IsString({ message: 'validation.org.name.mustBeString' })
    @IsNotEmpty({ message: 'validation.org.name.required' })
    name!: string;
}
