import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { EmailModule } from '../email/email.module';
import { InvitationModule } from 'src/invitations/invitation.module';

@Module({
    imports: [
        JwtModule, // Used by AuthService for token generation
        UserModule,
        EmailModule,
        InvitationModule,
    ],
    providers: [AuthService],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule {}
