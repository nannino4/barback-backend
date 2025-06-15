import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [
        UserModule,
        ConfigModule,
        JwtModule,
        EmailModule,
    ],
    providers: [AuthService, JwtAuthGuard],
    controllers: [AuthController],
    exports: [AuthService, JwtModule, JwtAuthGuard],
})
export class AuthModule {}
