import { SetMetadata } from '@nestjs/common';

export const SKIP_EMAIL_VERIFICATION_KEY = 'skipEmailVerification';

/**
 * Decorator to mark a route or controller as exempt from email verification enforcement.
 * Use this on endpoints that must remain accessible to authenticated but unverified users
 * (e.g., login, registration, verification flows, password reset, plan listing, webhooks).
 */
export const SkipEmailVerification = () => SetMetadata(SKIP_EMAIL_VERIFICATION_KEY, true);
