import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from './user/dto/out.user-response.dto';
import { User, UserRole, AuthProvider } from './user/schemas/user.schema';

describe('Output Transformation', () => 
{

    describe('UserResponseDto', () => 
    {
        it('should exclude sensitive fields from user data', () => 
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
                phoneNumber: '+1234567890',
                isEmailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as unknown as User;

            const transformed = plainToInstance(UserResponseDto, user, {
                excludeExtraneousValues: true,
            }) as UserResponseDto;

            // Should include safe fields
            expect(transformed.id).toBe(user.id);
            expect(transformed.email).toBe(user.email);
            expect(transformed.firstName).toBe(user.firstName);
            expect(transformed.lastName).toBe(user.lastName);
            expect(transformed.role).toBe(user.role);
            expect(transformed.isActive).toBe(user.isActive);
            expect(transformed.authProvider).toBe(user.authProvider);
            expect(transformed.phoneNumber).toBe(user.phoneNumber);
            expect(transformed.isEmailVerified).toBe(user.isEmailVerified);

            // Should exclude sensitive fields
            expect((transformed as any).hashedPassword).toBeUndefined();
            expect((transformed as any).emailVerificationToken).toBeUndefined();
            expect((transformed as any).passwordResetToken).toBeUndefined();
            expect((transformed as any).passwordResetExpires).toBeUndefined();
        });

        it('should handle MongoDB _id transformation', () => 
        {
            const userWithMongoId = {
                _id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                role: UserRole.USER,
                isActive: true,
                authProvider: AuthProvider.EMAIL,
                phoneNumber: '+1234567890',
                isEmailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const transformed = plainToInstance(UserResponseDto, userWithMongoId, {
                excludeExtraneousValues: true,
            }) as UserResponseDto;

            expect(transformed.id).toBe('507f1f77bcf86cd799439011');
        });

        it('should handle optional fields correctly', () => 
        {
            const minimalUser = {
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                role: UserRole.USER,
                isActive: true,
                authProvider: AuthProvider.EMAIL,
                isEmailVerified: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                // Optional fields not provided
            } as unknown as User;

            const transformed = plainToInstance(UserResponseDto, minimalUser, {
                excludeExtraneousValues: true,
            }) as UserResponseDto;

            expect(transformed.id).toBe(minimalUser.id);
            expect(transformed.email).toBe(minimalUser.email);
            expect(transformed.phoneNumber).toBeUndefined();
            expect(transformed.profilePictureUrl).toBeUndefined();
            expect(transformed.stripeCustomerId).toBeUndefined();
        });
    });
});
