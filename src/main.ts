import { NestFactory } from '@nestjs/core';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';

async function bootstrap() 
{
    const app = await NestFactory.create(AppModule, {
        logger: new ConsoleLogger(),
        rawBody: true, // Enable raw body for webhook processing
    });

    // Set global prefix for all routes
    app.setGlobalPrefix('api');

    // Enable global validation pipe
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true, // Strip properties that do not have any decorators
        forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
        transform: true, // Automatically transform payloads to DTO instances
        disableErrorMessages: false, // Keep error messages for debugging
    }));

    // Register custom throttler exception filter for consistent error format
    app.useGlobalFilters(app.get(ThrottlerExceptionFilter));

    const configService = app.get(ConfigService);
    const corsOrigin = configService.get<string>('FRONTEND_URL');

    app.enableCors({
        origin: corsOrigin,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });
    
    await app.listen(3000);
}
bootstrap();
