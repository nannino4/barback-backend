import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GoogleCallbackDto 
{
    @IsString()
    @IsNotEmpty()
    code!: string;

    @IsString()
    @IsOptional()
    state?: string;
}
