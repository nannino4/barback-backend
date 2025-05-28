import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService
{
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async validateUser(email: string, pass: string): Promise<any>
    {
        const user = await this.userService.findOneByEmail(email);
        if (user && await bcrypt.compare(pass, user.passwordHash))
        {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { passwordHash, ...result } = user.toObject(); // remove passwordHash from result
            return result;
        }
        return null;
    }

    async login(user: any)
    {
        const payload = { email: user.email, sub: user._id, roles: user.roles }; // Add roles to payload
        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    // We will add methods for registration, password reset, etc. later
}
