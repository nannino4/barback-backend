import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserRolesGuard } from './guards/user-roles.guard';
import { EmailVerifiedGuard } from './guards/email-verified.guard';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/schemas/user.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        JwtModule, // No configuration needed - guards use manual verification
    ],
    providers: [JwtAuthGuard, UserRolesGuard, EmailVerifiedGuard],
    exports: [
        JwtAuthGuard, 
        UserRolesGuard, 
        EmailVerifiedGuard,
        JwtModule,
        MongooseModule, // Export the User model so other modules can access it
    ],
})
export class AuthGuardModule {}
