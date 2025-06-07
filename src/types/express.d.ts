// src/types/express.d.ts
import { User } from '../user/schemas/user.schema';

declare global
{
    namespace Express
    {
        interface Request
        {
            user?: User; // Or your specific user payload type
        }
    }
}

// This empty export makes the file a module, which is necessary for augmentation.
export {};
