import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [UserModule, AuthModule],
    controllers: [AdminController],
    providers: [AdminService],
})
export class AdminModule {}
