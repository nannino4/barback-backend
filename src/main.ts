import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() 
{
    const app = await NestFactory.create(AppModule);
    
    // Enable global validation pipe
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true, // Strip properties that do not have any decorators
        forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
        transform: true, // Automatically transform payloads to DTO instances
        disableErrorMessages: false, // Keep error messages for debugging
    }));
    
    await app.listen(3000);
}
bootstrap();
