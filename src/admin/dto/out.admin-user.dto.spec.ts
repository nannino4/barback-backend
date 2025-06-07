import { plainToInstance } from 'class-transformer';
import { OutAdminUserDto } from './out.admin-user.dto';
import { UserRole, AuthProvider } from '../../user/schemas/user.schema';

describe('OutAdminUserDto', () => 
{
    describe('Admin-Level Field Exposure', () => 
    {
        it('should expose admin-relevant fields while maintaining security', () => 
        {
            const user = {
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                phoneNumber: '+393123456789',
                profilePictureUrl: 'https://example.com/profile.jpg',
                isEmailVerified: true,
                role: UserRole.USER,
                isActive: true,
                authProvider: AuthProvider.EMAIL,
                lastLogin: new Date('2025-06-07T10:00:00Z'),
                stripeCustomerId: 'cus_123456',
                createdAt: new Date('2025-01-01T00:00:00Z'),
                updatedAt: new Date('2025-06-01T00:00:00Z'),
                // Sensitive fields that should still be excluded
                hashedPassword: 'secretPassword123',
                emailVerificationToken: 'secretToken123',
                passwordResetToken: 'resetToken123',
                passwordResetExpires: new Date(),
                googleId: 'google_123456',
                refreshTokens: ['token1', 'token2'],
            } as any; // Plain object with all fields including timestamps

            const transformed = plainToInstance(OutAdminUserDto, user, {
                excludeExtraneousValues: true,
            }) as OutAdminUserDto;

            // Should include admin-relevant fields
            expect(transformed.id).toBe(user.id);
            expect(transformed.email).toBe(user.email);
            expect(transformed.firstName).toBe(user.firstName);
            expect(transformed.lastName).toBe(user.lastName);
            expect(transformed.phoneNumber).toBe(user.phoneNumber);
            expect(transformed.profilePictureUrl).toBe(user.profilePictureUrl);
            expect(transformed.isEmailVerified).toBe(user.isEmailVerified);
            expect(transformed.role).toBe(user.role);
            expect(transformed.isActive).toBe(user.isActive);
            expect(transformed.authProvider).toBe(user.authProvider);
            expect(transformed.lastLogin).toEqual(user.lastLogin);
            expect(transformed.stripeCustomerId).toBe(user.stripeCustomerId);
            expect(transformed.createdAt).toEqual(user.createdAt);
            expect(transformed.updatedAt).toEqual(user.updatedAt);

            // Should still exclude highly sensitive authentication fields
            expect((transformed as any).hashedPassword).toBeUndefined();
            expect((transformed as any).emailVerificationToken).toBeUndefined();
            expect((transformed as any).passwordResetToken).toBeUndefined();
            expect((transformed as any).passwordResetExpires).toBeUndefined();
            expect((transformed as any).googleId).toBeUndefined();
            expect((transformed as any).refreshTokens).toBeUndefined();
        });

        it('should handle different user roles for admin view', () => 
        {
            const adminUser = {
                id: '507f1f77bcf86cd799439011',
                email: 'admin@example.com',
                firstName: 'Admin',
                lastName: 'User',
                isEmailVerified: true,
                role: UserRole.ADMIN,
                isActive: true,
                authProvider: AuthProvider.EMAIL,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any;

            const transformed = plainToInstance(OutAdminUserDto, adminUser, {
                excludeExtraneousValues: true,
            }) as OutAdminUserDto;

            expect(transformed.role).toBe(UserRole.ADMIN);
            expect(transformed.email).toBe('admin@example.com');
        });

        it('should handle suspended users', () => 
        {
            const suspendedUser = {
                id: '507f1f77bcf86cd799439011',
                email: 'suspended@example.com',
                firstName: 'Suspended',
                lastName: 'User',
                isEmailVerified: false,
                role: UserRole.USER,
                isActive: false, // Suspended
                authProvider: AuthProvider.EMAIL,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any;

            const transformed = plainToInstance(OutAdminUserDto, suspendedUser, {
                excludeExtraneousValues: true,
            }) as OutAdminUserDto;

            expect(transformed.isActive).toBe(false);
            expect(transformed.isEmailVerified).toBe(false);
        });
    });

    describe('MongoDB Integration', () => 
    {
        it('should handle MongoDB _id transformation', () => 
        {
            const userWithMongoId = {
                _id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                isEmailVerified: true,
                role: UserRole.USER,
                isActive: true,
                authProvider: AuthProvider.EMAIL,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const transformed = plainToInstance(OutAdminUserDto, userWithMongoId, {
                excludeExtraneousValues: true,
            }) as OutAdminUserDto;

            expect(transformed.id).toBe('507f1f77bcf86cd799439011');
        });

        it('should handle ObjectId transformation', () => 
        {
            const userWithObjectId = {
                _id: { toString: () => '507f1f77bcf86cd799439011' },
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                isEmailVerified: true,
                role: UserRole.USER,
                isActive: true,
                authProvider: AuthProvider.EMAIL,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const transformed = plainToInstance(OutAdminUserDto, userWithObjectId, {
                excludeExtraneousValues: true,
            }) as OutAdminUserDto;

            expect(transformed.id).toBe('507f1f77bcf86cd799439011');
        });
    });

    describe('Optional Fields Handling', () => 
    {
        it('should handle missing optional fields', () => 
        {
            const minimalUser = {
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                isEmailVerified: true,
                role: UserRole.USER,
                isActive: true,
                authProvider: AuthProvider.EMAIL,
                createdAt: new Date(),
                updatedAt: new Date(),
                // Optional fields not provided: phoneNumber, profilePictureUrl, lastLogin, stripeCustomerId
            } as any;

            const transformed = plainToInstance(OutAdminUserDto, minimalUser, {
                excludeExtraneousValues: true,
            }) as OutAdminUserDto;

            expect(transformed.phoneNumber).toBeUndefined();
            expect(transformed.profilePictureUrl).toBeUndefined();
            expect(transformed.lastLogin).toBeUndefined();
            expect(transformed.stripeCustomerId).toBeUndefined();
        });

        it('should preserve null values for optional fields', () => 
        {
            const userWithNullFields = {
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                isEmailVerified: true,
                role: UserRole.USER,
                isActive: true,
                authProvider: AuthProvider.EMAIL,
                phoneNumber: null,
                profilePictureUrl: null,
                lastLogin: null,
                stripeCustomerId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any;

            const transformed = plainToInstance(OutAdminUserDto, userWithNullFields, {
                excludeExtraneousValues: true,
            }) as OutAdminUserDto;

            expect(transformed.phoneNumber).toBeNull();
            expect(transformed.profilePictureUrl).toBeNull();
            expect(transformed.lastLogin).toBeNull();
            expect(transformed.stripeCustomerId).toBeNull();
        });
    });

    describe('Different Authentication Providers', () => 
    {
        it('should handle Google OAuth users', () => 
        {
            const googleUser = {
                id: '507f1f77bcf86cd799439011',
                email: 'google@example.com',
                firstName: 'Google',
                lastName: 'User',
                isEmailVerified: true,
                role: UserRole.USER,
                isActive: true,
                authProvider: AuthProvider.GOOGLE,
                profilePictureUrl: 'https://lh3.googleusercontent.com/photo.jpg',
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any;

            const transformed = plainToInstance(OutAdminUserDto, googleUser, {
                excludeExtraneousValues: true,
            }) as OutAdminUserDto;

            expect(transformed.authProvider).toBe(AuthProvider.GOOGLE);
            expect(transformed.isEmailVerified).toBe(true); // Google emails are typically verified
        });

        it('should handle email-based users', () => 
        {
            const emailUser = {
                id: '507f1f77bcf86cd799439011',
                email: 'email@example.com',
                firstName: 'Email',
                lastName: 'User',
                isEmailVerified: false, // Might need verification
                role: UserRole.USER,
                isActive: true,
                authProvider: AuthProvider.EMAIL,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any;

            const transformed = plainToInstance(OutAdminUserDto, emailUser, {
                excludeExtraneousValues: true,
            }) as OutAdminUserDto;

            expect(transformed.authProvider).toBe(AuthProvider.EMAIL);
            expect(transformed.isEmailVerified).toBe(false);
        });
    });

    describe('Date Handling', () => 
    {
        it('should preserve Date objects', () => 
        {
            const createdDate = new Date('2025-01-01T00:00:00Z');
            const updatedDate = new Date('2025-06-01T00:00:00Z');
            const lastLoginDate = new Date('2025-06-07T10:00:00Z');

            const user = {
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                isEmailVerified: true,
                role: UserRole.USER,
                isActive: true,
                authProvider: AuthProvider.EMAIL,
                lastLogin: lastLoginDate,
                createdAt: createdDate,
                updatedAt: updatedDate,
            } as any;

            const transformed = plainToInstance(OutAdminUserDto, user, {
                excludeExtraneousValues: true,
            }) as OutAdminUserDto;

            expect(transformed.createdAt).toEqual(createdDate);
            expect(transformed.updatedAt).toEqual(updatedDate);
            expect(transformed.lastLogin).toEqual(lastLoginDate);
        });
    });
});
