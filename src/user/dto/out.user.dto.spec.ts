import { plainToInstance } from 'class-transformer';
import { OutUserDto } from './out.user.dto';
import { User, UserRole, AuthProvider } from '../schemas/user.schema';

describe('OutUserDto', () => 
{
    describe('Field Exposure and Security', () => 
    {
        it('should only expose safe fields from user data', () => 
        {
            const user = {
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                role: UserRole.USER,
                isActive: true,
                authProvider: AuthProvider.EMAIL,
                hashedPassword: 'secretPassword123', // This should be excluded
                emailVerificationToken: 'secretToken123', // This should be excluded
                passwordResetToken: 'resetToken123', // This should be excluded
                passwordResetExpires: new Date(), // This should be excluded
                phoneNumber: '+393123456789',
                isEmailVerified: true,
                profilePictureUrl: 'https://example.com/profile.jpg',
                stripeCustomerId: 'cus_123456', // This should be excluded
                createdAt: new Date(),
                updatedAt: new Date(),
            } as unknown as User;

            const transformed = plainToInstance(OutUserDto, user, {
                excludeExtraneousValues: true,
            }) as OutUserDto;

            // Should include only exposed fields
            expect(transformed.id).toBe(user.id);
            expect(transformed.email).toBe(user.email);
            expect(transformed.firstName).toBe(user.firstName);
            expect(transformed.lastName).toBe(user.lastName);
            expect(transformed.phoneNumber).toBe(user.phoneNumber);
            expect(transformed.profilePictureUrl).toBe(user.profilePictureUrl);
            expect(transformed.isEmailVerified).toBe(user.isEmailVerified);

            // Should exclude sensitive and non-exposed fields
            expect((transformed as any).hashedPassword).toBeUndefined();
            expect((transformed as any).emailVerificationToken).toBeUndefined();
            expect((transformed as any).passwordResetToken).toBeUndefined();
            expect((transformed as any).passwordResetExpires).toBeUndefined();
            expect((transformed as any).role).toBeUndefined();
            expect((transformed as any).isActive).toBeUndefined();
            expect((transformed as any).authProvider).toBeUndefined();
            expect((transformed as any).stripeCustomerId).toBeUndefined();
            expect((transformed as any).createdAt).toBeUndefined();
            expect((transformed as any).updatedAt).toBeUndefined();
        });

        it('should exclude all internal system fields', () => 
        {
            const userWithInternalFields = {
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                phoneNumber: '+393123456789',
                isEmailVerified: true,
                // Internal fields that should be excluded
                role: UserRole.ADMIN,
                isActive: false,
                authProvider: AuthProvider.GOOGLE,
                hashedPassword: 'hash123',
                emailVerificationToken: 'token123',
                passwordResetToken: 'reset123',
                passwordResetExpires: new Date(),
                stripeCustomerId: 'cus_123',
                refreshTokens: ['token1', 'token2'],
                loginAttempts: 5,
                lockUntil: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            } as unknown as User;

            const transformed = plainToInstance(OutUserDto, userWithInternalFields, {
                excludeExtraneousValues: true,
            }) as OutUserDto;

            // Verify no internal fields are exposed
            const internalFields = [
                'role', 'isActive', 'authProvider', 'hashedPassword', 
                'emailVerificationToken', 'passwordResetToken', 'passwordResetExpires',
                'stripeCustomerId', 'refreshTokens', 'loginAttempts', 'lockUntil',
                'createdAt', 'updatedAt',
            ];

            internalFields.forEach(field => 
            {
                expect((transformed as any)[field]).toBeUndefined();
            });
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
                phoneNumber: '+393123456789',
                isEmailVerified: true,
                profilePictureUrl: 'https://example.com/profile.jpg',
            };

            const transformed = plainToInstance(OutUserDto, userWithMongoId, {
                excludeExtraneousValues: true,
            }) as OutUserDto;

            expect(transformed.id).toBe('507f1f77bcf86cd799439011');
            expect(transformed.email).toBe('test@example.com');
            expect(transformed.firstName).toBe('John');
            expect(transformed.lastName).toBe('Doe');
        });

        it('should prefer _id over id when both are present', () => 
        {
            const userWithBothIds = {
                id: 'preferred-id',
                _id: 'mongo-id',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                isEmailVerified: true,
            };

            const transformed = plainToInstance(OutUserDto, userWithBothIds, {
                excludeExtraneousValues: true,
            }) as OutUserDto;

            // The transform logic prioritizes _id over id: obj._id?.toString() || obj.id
            expect(transformed.id).toBe('mongo-id');
        });
    });

    describe('Optional Fields Handling', () => 
    {
        it('should handle optional fields correctly when not provided', () => 
        {
            const minimalUser = {
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                isEmailVerified: false,
                // Optional fields not provided: phoneNumber, profilePictureUrl
            } as unknown as User;

            const transformed = plainToInstance(OutUserDto, minimalUser, {
                excludeExtraneousValues: true,
            }) as OutUserDto;

            expect(transformed.id).toBe(minimalUser.id);
            expect(transformed.email).toBe(minimalUser.email);
            expect(transformed.firstName).toBe(minimalUser.firstName);
            expect(transformed.lastName).toBe(minimalUser.lastName);
            expect(transformed.isEmailVerified).toBe(minimalUser.isEmailVerified);
            expect(transformed.phoneNumber).toBeUndefined();
            expect(transformed.profilePictureUrl).toBeUndefined();
        });

        it('should handle null optional fields', () => 
        {
            const userWithNullFields = {
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                isEmailVerified: true,
                phoneNumber: null,
                profilePictureUrl: null,
            } as unknown as User;

            const transformed = plainToInstance(OutUserDto, userWithNullFields, {
                excludeExtraneousValues: true,
            }) as OutUserDto;

            expect(transformed.phoneNumber).toBeNull();
            expect(transformed.profilePictureUrl).toBeNull();
        });

        it('should handle empty string optional fields', () => 
        {
            const userWithEmptyFields = {
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                isEmailVerified: true,
                phoneNumber: '',
                profilePictureUrl: '',
            } as unknown as User;

            const transformed = plainToInstance(OutUserDto, userWithEmptyFields, {
                excludeExtraneousValues: true,
            }) as OutUserDto;

            expect(transformed.phoneNumber).toBe('');
            expect(transformed.profilePictureUrl).toBe('');
        });
    });
});
