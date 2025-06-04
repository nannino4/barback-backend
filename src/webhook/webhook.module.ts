import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhookController } from './webhook.controller';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
    imports: [
        ConfigModule,
        SubscriptionModule,
    ],
    controllers: [WebhookController],
})
export class WebhookModule {}
