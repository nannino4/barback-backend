import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UserModule } from '../user/user.module';
import { AuthGuardModule } from '../auth/auth-guard.module';

@Module({
    imports: [
        UserModule, // Used by AdminController for user management
        AuthGuardModule, // Provides JwtAuthGuard and UserRolesGuard
    ],
    controllers: [AdminController],
    providers: [],
})
export class AdminModule {}
