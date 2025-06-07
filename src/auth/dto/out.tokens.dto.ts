import { Expose } from "class-transformer";

export class OutTokensDto 
{
    @Expose()
    access_token!: string;

    @Expose()
    refresh_token!: string;
}