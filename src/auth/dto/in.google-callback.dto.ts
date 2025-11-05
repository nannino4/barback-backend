import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleCallbackDto 
{
    @IsString({ message: 'validation.code.mustBeString' })
    @IsNotEmpty({ message: 'validation.code.required' })
    code!: string;

    @IsString({ message: 'validation.state.mustBeString' })
    @IsNotEmpty({ message: 'validation.state.required' })
    state!: string;
}

