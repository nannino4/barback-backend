import { Expose } from 'class-transformer';

export class TokensDto 
{
    @Expose()
    access_token!: string;
    
    @Expose()
    refresh_token!: string;
}