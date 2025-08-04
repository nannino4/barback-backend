import { Module, Global } from '@nestjs/common';
import { CorrelationIdInterceptor } from './interceptors/correlation-id.interceptor';
import { CustomLogger } from './logger/custom.logger';
import { CorrelationService } from './services/correlation.service';

@Global() // Makes this module available globally without importing
@Module({
    providers: [
        CorrelationIdInterceptor,
        CustomLogger,
        CorrelationService,
    ],
    exports: [
        CorrelationIdInterceptor,
        CustomLogger,
        CorrelationService,
    ],
})
export class CommonModule {}
