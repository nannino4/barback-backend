import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { EmailModule } from '../email/email.module';
import { GoogleService } from './google.service';
import { AuthGuardModule } from './auth-guard.module';

@Module({
    imports: [
        JwtModule, // Used by AuthService for token generation
        UserModule,
        EmailModule,
        AuthGuardModule,
    ],
    providers: [AuthService, GoogleService],
    controllers: [AuthController],
    exports: [AuthService, GoogleService],
})
export class AuthModule {}
