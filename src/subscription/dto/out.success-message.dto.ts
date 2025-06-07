import { Expose } from 'class-transformer';

export class OutSuccessMessageDto 
{
    @Expose()
    message!: string;

    @Expose()
    success!: boolean;

    constructor(message: string) 
    {
        this.message = message;
        this.success = true;
    }
}
