import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { WebhookController } from './webhook.controller';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { UserModule } from '../user/user.module';
import { AuthGuardModule } from '../auth/auth-guard.module';
import { StripeService } from 'src/common/services/stripe.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Subscription.name, schema: SubscriptionSchema }]),
        AuthGuardModule,
        UserModule,
    ],
    controllers: [SubscriptionController, PaymentController, WebhookController],
    providers: [SubscriptionService, PaymentService, StripeService],
    exports: [SubscriptionService, PaymentService, StripeService],
})
export class SubscriptionModule {}
