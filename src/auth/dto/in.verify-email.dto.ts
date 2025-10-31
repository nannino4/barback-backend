import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto 
{
    @IsString({ message: 'validation.token.mustBeString' })
    @IsNotEmpty({ message: 'validation.token.required' })
    token!: string;
}
