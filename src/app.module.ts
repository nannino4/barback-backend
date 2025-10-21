import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { CommonModule } from './common/common.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { OrgModule } from './org/org.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';
import { AppController } from './app.controller';

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: `.env.${process.env.NODE_ENV || 'dev'}`,
            isGlobal: true,
        }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                uri: configService.get<string>('MONGODB_URI'),
            }),
            inject: [ConfigService],
        }),
        ThrottlerModule.forRoot([
            {
                ttl: 60000, // 60 seconds in milliseconds
                limit: 10, // Default limit (can be overridden per endpoint)
            },
        ]),
        CommonModule,
        UserModule,
        AuthModule,
        AdminModule,
        SubscriptionModule,
        OrgModule,
        CategoryModule,
        ProductModule,
    ],
    controllers: [AppController],
    providers: [
        // Global interceptor for correlation ID tracking
        {
            provide: APP_INTERCEPTOR,
            useClass: CorrelationIdInterceptor,
        },
        // Global exception filter for throttler errors
        {
            provide: APP_FILTER,
            useClass: ThrottlerExceptionFilter,
        },
        // Note: ThrottlerGuard is NOT applied globally
        // It's only applied to specific endpoints via @UseGuards(ThrottlerGuard)
    ],
})
export class AppModule {}
