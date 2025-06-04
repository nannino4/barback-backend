import { Expose } from 'class-transformer';
import { UserResponseDto } from '../../user/dto/user-response.dto';

export class AuthResponseDto 
{
    @Expose()
    access_token!: string;

    @Expose()
    refresh_token!: string;

    @Expose()
    user!: UserResponseDto;
}
