import { Expose, Type } from 'class-transformer';
import { UserResponseDto } from '../../user/dto/user-response.dto';

export class RegisterResponseDto 
{
    @Expose()
    access_token!: string;

    @Expose()
    refresh_token!: string;

    @Expose()
    @Type(() => UserResponseDto)
    user!: UserResponseDto;
}
