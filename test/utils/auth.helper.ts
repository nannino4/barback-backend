import { JwtService } from '@nestjs/jwt';
import { ExecutionContext } from '@nestjs/common';
import { User, UserRole, AuthProvider } from '../../src/user/schemas/user.schema';

export class AuthTestHelper
{
    static createMockUser(overrides: Partial<User> = {}): Partial<User>
    {
        return {
            id: '507f1f77bcf86cd799439011',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: UserRole.USER,
            isActive: true,
            authProvider: AuthProvider.EMAIL,
            hashedPassword: 'hashedPassword123',
            phoneNumber: '+1234567890',
            isEmailVerified: true,
            ...overrides,
        };
    }

    static createJwtToken(jwtService: JwtService, user: Partial<User>): string
    {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        return jwtService.sign(payload);
    }

    static createMockAuthGuard(user: Partial<User> | null = null)
    {
        return {
            canActivate: (context: ExecutionContext) =>
            {
                if (!user)
                {
                    return false;
                }
                const request = context.switchToHttp().getRequest();
                request.user = user;
                return true;
            },
        };
    }

    static createAdminUser(): Partial<User>
    {
        return this.createMockUser({
            id: '507f1f77bcf86cd799439012',
            email: 'admin@example.com',
            role: UserRole.ADMIN,
        });
    }

    static createGoogleUser(): Partial<User>
    {
        return this.createMockUser({
            id: '507f1f77bcf86cd799439013',
            email: 'google@example.com',
            authProvider: AuthProvider.GOOGLE,
            googleId: 'google_123456789',
            hashedPassword: undefined,
        });
    }

    static createInactiveUser(): Partial<User>
    {
        return this.createMockUser({
            id: '507f1f77bcf86cd799439014',
            email: 'inactive@example.com',
            isActive: false,
        });
    }
}
