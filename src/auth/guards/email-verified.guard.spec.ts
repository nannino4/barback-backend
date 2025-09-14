import { EmailVerifiedGuard } from './email-verified.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { CustomLogger } from '../../common/logger/custom.logger';
import { EmailNotVerifiedException } from '../exceptions/email-verification.exception';

// Simple mock logger
class MockLogger implements Partial<CustomLogger>
{
    debug(): void { /* noop */ }
    warn(): void { /* noop */ }
    log(): void { /* noop */ }
    error(): void { /* noop */ }
    verbose(): void { /* noop */ }
}

describe('EmailVerifiedGuard', () => 
{
    let guard: EmailVerifiedGuard;
    let reflector: Reflector;

    const makeContext = (user?: any, skip = false): ExecutionContext =>
    {
        return {
            switchToHttp: () => ({
                getRequest: () => ({ user }),
            }),
            getHandler: () => (skip ? (() => {}) : (() => {})),
            getClass: () => (function TestClass() {}),
            // Unused members mocked as any
        } as unknown as ExecutionContext;
    };

    beforeEach(() => 
    {
        reflector = new Reflector();
        guard = new EmailVerifiedGuard(reflector, new MockLogger() as unknown as CustomLogger);
    });

    it('allows when no user (public route fall-through)', () =>
    {
        const ctx = makeContext(undefined, false);
        expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows when skip metadata present', () =>
    {
        // Manually patch reflector behavior
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
        const ctx = makeContext({ isEmailVerified: false });
        expect(guard.canActivate(ctx)).toBe(true);
    });

    it('throws when user unverified and not skipped', () =>
    {
        const ctx = makeContext({ email: 'u@test.com', isEmailVerified: false });
        expect(() => guard.canActivate(ctx)).toThrow(EmailNotVerifiedException);
    });

    it('allows when user verified', () =>
    {
        const ctx = makeContext({ email: 'v@test.com', isEmailVerified: true });
        expect(guard.canActivate(ctx)).toBe(true);
    });
});
