import { NestFactory } from '@nestjs/core';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() 
{
    const app = await NestFactory.create(AppModule, {
        logger: new ConsoleLogger("", {
            timestamp: true,
        }),
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

    const configService = app.get(ConfigService);
    const corsOrigins = configService.get<string>('CORS_ORIGINS');

    if (corsOrigins) 
    {
        const allowedOrigins = corsOrigins.split(',');
        app.enableCors({
            origin: (origin, callback) => 
            {
                if (!origin || allowedOrigins.indexOf(origin) !== -1) 
                {
                    callback(null, true);
                }
                else 
                {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
            credentials: true,
        });
    }
    
    await app.listen(3000);
}
bootstrap();
