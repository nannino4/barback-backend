// src/types/express.d.ts
import { JwtPayload } from 'jsonwebtoken'; // Or your custom payload type

declare global
{
    namespace Express
    {
        interface Request
        {
            user?: string | JwtPayload; // Or your specific user payload type
        }
    }
}

// This empty export makes the file a module, which is necessary for augmentation.
export {};
