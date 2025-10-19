import { Module, Global } from '@nestjs/common';
import { CorrelationIdInterceptor } from './interceptors/correlation-id.interceptor';
import { CustomLogger } from './logger/custom.logger';
import { CorrelationService } from './services/correlation.service';
import { ThrottlerExceptionFilter } from './filters/throttler-exception.filter';

@Global() // Makes this module available globally without importing
@Module({
    providers: [
        CorrelationIdInterceptor,
        CustomLogger,
        CorrelationService,
        ThrottlerExceptionFilter,
    ],
    exports: [
        CorrelationIdInterceptor,
        CustomLogger,
        CorrelationService,
        ThrottlerExceptionFilter,
    ],
})
export class CommonModule {}
