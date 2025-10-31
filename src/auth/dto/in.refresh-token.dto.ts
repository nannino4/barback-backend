import { IsJWT } from 'class-validator';

export class RefreshTokenDto 
{
    @IsJWT({ message: 'validation.refreshToken.invalidJWT' })
    refresh_token!: string;
}
