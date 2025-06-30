import { Expose, Type } from "class-transformer";
import { OutUserDto } from "../../user/dto/out.user.dto";

export class OutAuthResponseDto
{
    @Expose()
    access_token!: string;

    @Expose()
    refresh_token!: string;

    @Expose()
    @Type(() => OutUserDto)
    user!: OutUserDto;
}
