import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserSchema } from './schemas/user.schema';
import { AuthModule } from '../auth/auth.module'; // Import AuthModule

@Module({
    imports: [
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        AuthModule, // Add AuthModule to imports
    ],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService], // Export UserService if it needs to be used in other modules (e.g., AuthModule)
})
export class UserModule { }
