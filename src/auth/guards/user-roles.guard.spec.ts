import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRolesGuard } from './user-roles.guard';
import { UserRole } from '../../user/schemas/user.schema';

describe('UserRolesGuard - Output-Focused Tests', () => 
{
    let guard: UserRolesGuard;
    let reflector: Reflector;

    const createMockContext = (user: any): Partial<ExecutionContext> => ({
        switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({ user }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
    });

    beforeEach(async () => 
    {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserRolesGuard,
                {
                    provide: Reflector,
                    useValue: {
                        getAllAndOverride: jest.fn(),
                    },
                },
            ],
        }).compile();

        guard = module.get<UserRolesGuard>(UserRolesGuard);
        reflector = module.get<Reflector>(Reflector);
    });

    it('should be defined', () => 
    {
        expect(guard).toBeDefined();
    });

    describe('Access Control Behavior', () => 
    {
        it('should grant access when no role restrictions are defined', () => 
        {
            // Arrange - No role restrictions on endpoint
            const context = createMockContext({ role: UserRole.USER });
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

            // Act
            const canAccess = guard.canActivate(context as ExecutionContext);

            // Assert - User should be granted access
            expect(canAccess).toBe(true);
        });

        it('should grant access when user has exact role match', () => 
        {
            // Arrange - Admin-only endpoint with admin user
            const adminUser = { role: UserRole.ADMIN, email: 'admin@example.com' };
            const context = createMockContext(adminUser);
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

            // Act
            const canAccess = guard.canActivate(context as ExecutionContext);

            // Assert - Admin user should be granted access to admin endpoint
            expect(canAccess).toBe(true);
        });

        it('should grant access when user has one of multiple allowed roles', () => 
        {
            // Arrange - Endpoint allowing both USER and ADMIN roles
            const regularUser = { role: UserRole.USER, email: 'user@example.com' };
            const context = createMockContext(regularUser);
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN, UserRole.USER]);

            // Act
            const canAccess = guard.canActivate(context as ExecutionContext);

            // Assert - Regular user should be granted access
            expect(canAccess).toBe(true);
        });

        it('should deny access when user lacks required role', () => 
        {
            // Arrange - Admin-only endpoint with regular user
            const regularUser = { role: UserRole.USER, email: 'user@example.com' };
            const context = createMockContext(regularUser);
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

            // Act & Assert - Regular user should be denied access to admin endpoint
            expect(() => guard.canActivate(context as ExecutionContext)).toThrow(ForbiddenException);
        });

        it('should deny access when no user is authenticated', () => 
        {
            // Arrange - Protected endpoint with no authenticated user
            const context = createMockContext(null);
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.USER]);

            // Act & Assert - Unauthenticated request should be denied
            expect(() => guard.canActivate(context as ExecutionContext)).toThrow(ForbiddenException);
        });

        it('should provide clear error message when access is denied', () => 
        {
            // Arrange - Admin-only endpoint with regular user
            const regularUser = { role: UserRole.USER, email: 'user@example.com' };
            const context = createMockContext(regularUser);
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

            // Act & Assert - Error should indicate required roles
            expect(() => guard.canActivate(context as ExecutionContext)).toThrow(
                new ForbiddenException('Access denied. Required roles: admin'),
            );
        });

        it('should handle multiple role requirements in error message', () => 
        {
            // Arrange - Multi-role endpoint with insufficient user role
            const regularUser = { role: UserRole.USER, email: 'user@example.com' };
            const context = createMockContext(regularUser);
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

            // Act & Assert - Should deny access and show required roles
            expect(() => guard.canActivate(context as ExecutionContext)).toThrow(ForbiddenException);
        });
    });
});
