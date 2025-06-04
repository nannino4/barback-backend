import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRolesGuard } from './user-roles.guard';
import { UserRole } from '../../user/schemas/user.schema';
import { USER_ROLES_KEY } from '../decorators/user-roles.decorator';

describe('UserRolesGuard', () => 
{
    let guard: UserRolesGuard;
    let reflector: Reflector;

    const mockExecutionContext = (user: any): Partial<ExecutionContext> => ({
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

    describe('canActivate', () => 
    {
        it('should allow access when no roles are required', () => 
        {
            // Arrange
            const context = mockExecutionContext({ role: UserRole.USER });
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

            // Act
            const result = guard.canActivate(context as ExecutionContext);

            // Assert
            expect(result).toBe(true);
            expect(reflector.getAllAndOverride).toHaveBeenCalledWith(USER_ROLES_KEY, [
                context.getHandler!(),
                context.getClass!(),
            ]);
        });

        it('should allow access when user has required role', () => 
        {
            // Arrange
            const user = { role: UserRole.ADMIN, email: 'admin@example.com' };
            const context = mockExecutionContext(user);
            const requiredRoles = [UserRole.ADMIN];
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

            // Act
            const result = guard.canActivate(context as ExecutionContext);

            // Assert
            expect(result).toBe(true);
        });

        it('should allow access when user has one of multiple required roles', () => 
        {
            // Arrange
            const user = { role: UserRole.USER, email: 'user@example.com' };
            const context = mockExecutionContext(user);
            const requiredRoles = [UserRole.ADMIN, UserRole.USER];
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

            // Act
            const result = guard.canActivate(context as ExecutionContext);

            // Assert
            expect(result).toBe(true);
        });

        it('should deny access when user does not have required role', () => 
        {
            // Arrange
            const user = { role: UserRole.USER, email: 'user@example.com' };
            const context = mockExecutionContext(user);
            const requiredRoles = [UserRole.ADMIN];
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

            // Act & Assert
            expect(() => guard.canActivate(context as ExecutionContext)).toThrow(ForbiddenException);
        });

        it('should deny access when user is not found in request', () => 
        {
            // Arrange
            const context = mockExecutionContext(null);
            const requiredRoles = [UserRole.ADMIN];
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

            // Act & Assert
            expect(() => guard.canActivate(context as ExecutionContext)).toThrow(ForbiddenException);
        });

        it('should throw ForbiddenException with proper message when access is denied', () => 
        {
            // Arrange
            const user = { role: UserRole.USER, email: 'user@example.com' };
            const context = mockExecutionContext(user);
            const requiredRoles = [UserRole.ADMIN];
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

            // Act & Assert
            expect(() => guard.canActivate(context as ExecutionContext)).toThrow(
                new ForbiddenException('Access denied. Required roles: admin'),
            );
        });
    });
});
