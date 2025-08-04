import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { randomUUID } from 'crypto';

export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const CORRELATION_ID_KEY = 'barback_correlation_id';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor
{
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>
    {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        // Get correlation ID from header or generate a new one
        let correlationId = request.headers[CORRELATION_ID_HEADER];
        if (!correlationId)
        {
            correlationId = randomUUID();
        }

        // Store correlation ID in request for use in services
        request[CORRELATION_ID_KEY] = correlationId;

        // Add correlation ID to response headers
        response.setHeader(CORRELATION_ID_HEADER, correlationId);

        // Pass through to the route handler
        return next.handle();
    }
}
