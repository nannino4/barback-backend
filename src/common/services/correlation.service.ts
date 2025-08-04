import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { CORRELATION_ID_KEY } from '../interceptors/correlation-id.interceptor';

/**
 * Request-scoped service that provides the current request's correlation ID
 * This allows any service to access the correlation ID without explicit parameter passing
 */
@Injectable({ scope: Scope.REQUEST })
export class CorrelationService
{
    constructor(@Inject(REQUEST) private readonly request: Request) {}

    /**
     * Get the correlation ID for the current request
     */
    getCorrelationId(): string | undefined
    {
        return this.request[CORRELATION_ID_KEY];
    }
}
