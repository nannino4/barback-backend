import { Module, Global } from '@nestjs/common';
import { CorrelationIdService } from './services/correlation-id.service';

@Global()
@Module({
    providers: [CorrelationIdService],
    exports: [CorrelationIdService],
})
export class CommonModule {}
