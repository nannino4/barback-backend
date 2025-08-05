import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as request from 'supertest';
import { JwtModule } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserSchema } from './schemas/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserProfileDto } from './dto/in.update-user-profile.dto';
import { ChangePasswordDto } from './dto/in.change-password.dto';
import { CustomLogger } from '../common/logger/custom.logger';

describe('UserController (Integration)', () =>
{
    let app: INestApplication;
    let mongoServer: MongoMemoryServer;
    let userService: UserService;
    let testUser: User;
    let mockLogger: jest.Mocked<CustomLogger>;

    beforeAll(async () =>
    {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        mockLogger = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
        } as any;

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                MongooseModule.forRoot(mongoUri),
                MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
                JwtModule.register({
                    secret: 'test-secret',
                    signOptions: { expiresIn: '1h' },
                }),
            ],
            controllers: [UserController],
            providers: [
                UserService,
                {
                    provide: CustomLogger,
                    useValue: mockLogger,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: () => true, // Will be overridden in beforeEach
            })
            .compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api');
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));

        userService = moduleFixture.get<UserService>(UserService);
        
        await app.init();
    });

    afterAll(async () =>
    {
        await app.close();
        await mongoServer.stop();
    });

    beforeEach(async () =>
    {
        // Create test user with hashed password
        const hashedPassword = await bcrypt.hash('testPassword123', 10);
        testUser = await userService.create({
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            hashedPassword,
            phoneNumber: '+1234567890',
        });

        // Override guard to use the created test user
        const moduleRef = app.get(JwtAuthGuard);
        jest.spyOn(moduleRef, 'canActivate').mockImplementation(async (context) =>
        {
            const request = context.switchToHttp().getRequest();
            // Get fresh user data from database to ensure updates are reflected
            const freshUser = await userService.findById(testUser.id);
            request.user = freshUser;
            return true;
        });
    });

    afterEach(async () =>
    {
        // Clean up database after each test
        const userModel = app.get('UserModel');
        await userModel.deleteMany({}).exec();
    });

    describe('GET /users/me', () =>
    {
        it('should return current user profile', async () =>
        {
            const response = await request(app.getHttpServer())
                .get('/api/users/me')
                .expect(200);

            expect(response.body.email).toBe(testUser.email);
            expect(response.body.firstName).toBe(testUser.firstName);
            expect(response.body.lastName).toBe(testUser.lastName);
            expect(response.body.hashedPassword).toBeUndefined(); // Should not expose password
        });
    });

    describe('PUT /users/me', () =>
    {
        it('should update user profile successfully', async () =>
        {
            const updateData: UpdateUserProfileDto = {
                firstName: 'Jane',
                lastName: 'Smith',
                phoneNumber: '+393123456789', // Valid Italian phone number
            };

            const response = await request(app.getHttpServer())
                .put('/api/users/me')
                .send(updateData)
                .expect(200);

            expect(response.body.firstName).toBe(updateData.firstName);
            expect(response.body.lastName).toBe(updateData.lastName);
            expect(response.body.phoneNumber).toBe(updateData.phoneNumber);
            expect(response.body.email).toBe(testUser.email); // Should remain unchanged
        });

        it('should validate input and reject invalid data', async () =>
        {
            const invalidData = {
                firstName: 123, // Should be string
                phoneNumber: 'invalid-phone',
            };

            await request(app.getHttpServer())
                .put('/api/users/me')
                .send(invalidData)
                .expect(400);
        });

        it('should allow partial updates', async () =>
        {
            const partialUpdate = {
                firstName: 'UpdatedName',
            };

            const response = await request(app.getHttpServer())
                .put('/api/users/me')
                .send(partialUpdate)
                .expect(200);

            expect(response.body.firstName).toBe(partialUpdate.firstName);
            expect(response.body.lastName).toBe(testUser.lastName); // Should remain unchanged
        });
    });

    describe('PUT /users/me/password', () =>
    {
        it('should change password successfully', async () =>
        {
            const changePasswordDto: ChangePasswordDto = {
                currentPassword: 'testPassword123',
                newPassword: 'NewPassword123!',
            };

            const response = await request(app.getHttpServer())
                .put('/api/users/me/password')
                .send(changePasswordDto)
                .expect(200);

            // Should return empty response body for void method
            expect(response.body).toEqual({});

            // Verify password was actually changed by attempting to authenticate with new password
            const updatedUser = await userService.findById(testUser.id);
            expect(updatedUser).toBeDefined();
            expect(updatedUser!.hashedPassword).toBeDefined();
            const isNewPasswordValid = await bcrypt.compare('NewPassword123!', updatedUser!.hashedPassword!);
            expect(isNewPasswordValid).toBe(true);
        });

        it('should reject weak passwords', async () =>
        {
            const weakPasswordDto = {
                currentPassword: 'testPassword123',
                newPassword: 'weak', // Too weak
            };

            await request(app.getHttpServer())
                .put('/api/users/me/password')
                .send(weakPasswordDto)
                .expect(400);
        });

        it('should reject incorrect current password', async () =>
        {
            const incorrectPasswordDto: ChangePasswordDto = {
                currentPassword: 'wrongPassword',
                newPassword: 'NewPassword123!',
            };

            await request(app.getHttpServer())
                .put('/api/users/me/password')
                .send(incorrectPasswordDto)
                .expect(401);
        });

        it('should validate password requirements', async () =>
        {
            const invalidPasswords = [
                { newPassword: 'short' }, // Too short
                { newPassword: 'nouppercase123!' }, // No uppercase
                { newPassword: 'NOLOWERCASE123!' }, // No lowercase
                { newPassword: 'NoNumbers!' }, // No numbers
                { newPassword: 'NoSpecialChars123' }, // No special characters
                { newPassword: 'ThisPasswordIsTooLongForValidation123!' }, // Too long (>20 chars)
                { newPassword: 'testPassword123' }, // Same as current password
            ];

            for (const invalidPassword of invalidPasswords)
            {
                await request(app.getHttpServer())
                    .put('/api/users/me/password')
                    .send({
                        currentPassword: 'testPassword123',
                        ...invalidPassword,
                    })
                    .expect(400);
            }
        });
    });

    describe('DELETE /users/me', () =>
    {
        it('should delete user account successfully', async () =>
        {
            const userIdToDelete = testUser.id;
            
            const response = await request(app.getHttpServer())
                .delete('/api/users/me')
                .expect(200);

            // Should return empty response body for void method
            expect(response.body).toEqual({});

            // Verify user was actually deleted from database
            try 
            {
                await userService.findById(userIdToDelete);
                // If no error is thrown, the test should fail
                fail('Expected user to be deleted but was still found');
            } 
            catch (error: any) 
            {
                // Expect a NotFoundException to be thrown
                expect(error.message).toContain('not found');
            }
        });

        it('should return 404 when trying to delete non-existent user', async () =>
        {
            // First delete the user
            await request(app.getHttpServer())
                .delete('/api/users/me')
                .expect(200);

            // Try to delete again - should fail
            await request(app.getHttpServer())
                .delete('/api/users/me')
                .expect(404);
        });
    });

    describe('Authentication Guard', () =>
    {
        it('should require authentication for all endpoints', async () =>
        {
            // Override the guard to reject authentication
            const moduleWithoutAuth = await Test.createTestingModule({
                imports: [
                    MongooseModule.forRoot(mongoServer.getUri()),
                    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
                    JwtModule.register({
                        secret: 'test-secret',
                        signOptions: { expiresIn: '1h' },
                    }),
                ],
                controllers: [UserController],
                providers: [
                    UserService,
                    {
                        provide: CustomLogger,
                        useValue: mockLogger,
                    },
                ],
            })
                .overrideGuard(JwtAuthGuard)
                .useValue({
                    canActivate: () => false, // Reject all requests
                })
                .compile();

            const unauthenticatedApp = moduleWithoutAuth.createNestApplication();
            unauthenticatedApp.setGlobalPrefix('api');
            await unauthenticatedApp.init();

            // Test all endpoints require authentication
            await request(unauthenticatedApp.getHttpServer())
                .get('/api/users/me')
                .expect(403);

            await request(unauthenticatedApp.getHttpServer())
                .put('/api/users/me')
                .send({ firstName: 'Test' })
                .expect(403);

            await request(unauthenticatedApp.getHttpServer())
                .put('/api/users/me/password')
                .send({ currentPassword: 'test', newPassword: 'NewTest123!' })
                .expect(403);

            await request(unauthenticatedApp.getHttpServer())
                .delete('/api/users/me')
                .expect(403);

            await unauthenticatedApp.close();
        });
    });

    describe('Error Handling', () =>
    {
        it('should handle service errors gracefully', async () =>
        {
            // Mock service to throw error
            jest.spyOn(userService, 'updateProfile').mockRejectedValueOnce(
                new Error('Database connection failed')
            );

            await request(app.getHttpServer())
                .put('/api/users/me')
                .send({ firstName: 'Test' })
                .expect(500);
        });

        it('should return proper error format for validation failures', async () =>
        {
            const response = await request(app.getHttpServer())
                .put('/api/users/me')
                .send({
                    firstName: '', // Empty string should fail validation
                })
                .expect(400);

            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('statusCode', 400);
        });

        it('should handle concurrent password changes', async () =>
        {
            const changePasswordDto: ChangePasswordDto = {
                currentPassword: 'testPassword123',
                newPassword: 'NewPassword123!',
            };

            // Simulate concurrent password change requests
            const promises = Array(3).fill(null).map(() =>
                request(app.getHttpServer())
                    .put('/api/users/me/password')
                    .send(changePasswordDto)
            );

            const results = await Promise.allSettled(promises);
            
            // At least one should succeed
            const successfulRequests = results.filter(result => 
                result.status === 'fulfilled' && result.value.status === 200
            );
            
            expect(successfulRequests.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Input Validation', () =>
    {
        it('should validate UpdateUserProfileDto fields', async () =>
        {
            const invalidUpdates = [
                { firstName: 123 }, // Should be string
                { lastName: null }, // Should be string if provided
                { phoneNumber: 'invalid-phone-format' }, // Should be valid phone number
                { firstName: 'a'.repeat(101) }, // Too long
            ];

            for (const invalidUpdate of invalidUpdates)
            {
                await request(app.getHttpServer())
                    .put('/api/users/me')
                    .send(invalidUpdate)
                    .expect(400);
            }
        });

        it('should accept valid phone number formats', async () =>
        {
            const validPhoneNumbers = [
                '+393123456789',    // Italian mobile format
                '+393987654321',    // Italian mobile format  
                '+393331234567',    // Italian mobile format
            ];

            for (const phoneNumber of validPhoneNumbers)
            {
                await request(app.getHttpServer())
                    .put('/api/users/me')
                    .send({ phoneNumber })
                    .expect(200);
            }
        });
    });

    describe('Security', () =>
    {
        it('should not expose sensitive information in responses', async () =>
        {
            const response = await request(app.getHttpServer())
                .get('/api/users/me')
                .expect(200);

            expect(response.body).not.toHaveProperty('hashedPassword');
            expect(response.body).not.toHaveProperty('passwordResetToken');
            expect(response.body).not.toHaveProperty('emailVerificationToken');
        });

        it('should require strong passwords', async () =>
        {
            const weakPasswords = [
                'password', // No uppercase, numbers, or special chars
                'PASSWORD', // No lowercase, numbers, or special chars
                '12345678', // No letters or special chars
                'Pass1!', // Too short
                'Pass123', // No special chars
                'pass123!', // No uppercase
                'PASS123!', // No lowercase
            ];

            for (const weakPassword of weakPasswords)
            {
                await request(app.getHttpServer())
                    .put('/api/users/me/password')
                    .send({
                        currentPassword: 'testPassword123',
                        newPassword: weakPassword,
                    })
                    .expect(400);
            }
        });
    });

    describe('User State Management', () =>
    {
        it('should handle user profile updates with partial data', async () =>
        {
            const partialUpdates: Array<Record<string, string>> = [
                { firstName: 'NewFirstName' },
                { lastName: 'NewLastName' },
                { phoneNumber: '+393987654321' }, // Valid Italian phone number
                { firstName: 'Both', lastName: 'Updated' },
            ];

            for (const update of partialUpdates)
            {
                const response = await request(app.getHttpServer())
                    .put('/api/users/me')
                    .send(update)
                    .expect(200);

                Object.keys(update).forEach(key =>
                {
                    expect(response.body[key]).toBe(update[key]);
                });
            }
        });

        it('should maintain user state consistency after updates', async () =>
        {
            const updates = {
                firstName: 'UpdatedFirst',
                lastName: 'UpdatedLast',
                phoneNumber: '+393456789012', // Valid Italian phone number
            };

            await request(app.getHttpServer())
                .put('/api/users/me')
                .send(updates)
                .expect(200);

            // Verify changes are persisted
            const getResponse = await request(app.getHttpServer())
                .get('/api/users/me')
                .expect(200);

            expect(getResponse.body.firstName).toBe(updates.firstName);
            expect(getResponse.body.lastName).toBe(updates.lastName);
            expect(getResponse.body.phoneNumber).toBe(updates.phoneNumber);
            expect(getResponse.body.email).toBe(testUser.email); // Should remain unchanged
        });
    });
});
