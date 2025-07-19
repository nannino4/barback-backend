import { Expose } from 'class-transformer';

export class OutGoogleAuthUrlDto 
{
    @Expose()
    authUrl!: string;

    @Expose()
    state!: string;
}
