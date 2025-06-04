import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { UserModule } from '../user/user.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Subscription.name, schema: SubscriptionSchema }]),
        ConfigModule,
        UserModule,
        AuthModule,
    ],
    controllers: [SubscriptionController, PaymentController],
    providers: [SubscriptionService, PaymentService],
    exports: [SubscriptionService, PaymentService],
})
export class SubscriptionModule {}
