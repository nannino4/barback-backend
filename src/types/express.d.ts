// src/types/express.d.ts
import { User } from '../user/schemas/user.schema';

declare global
{
    namespace Express
    {
        interface Request
        {
            user?: User; // For authenticated requests
            barback_correlation_id?: string; // Correlation ID for request tracing
        }
    }
}

// This empty export makes the file a module, which is necessary for augmentation.
export {};
