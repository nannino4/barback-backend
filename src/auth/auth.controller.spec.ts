import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { User, UserSchema } from '../user/schemas/user.schema';
import { RegisterEmailDto } from './dto/in.register-email.dto';
import { LoginEmailDto } from './dto/in.login-email.dto';
import { RefreshTokenDto } from './dto/in.refresh-token.dto';
import { DatabaseTestHelper } from '../../test/utils/database.helper';
import { EmailService } from '../email/email.service';
import { InvitationService } from '../invitation/invitation.service';
import { GoogleService } from './google.service';
import { CustomLogger } from '../common/logger/custom.logger';

describe('AuthController - Integration Tests', () => 
{
    let app: INestApplication;
    let userService: UserService;
    let connection: Connection;
    let module: TestingModule;
    let mockEmailService: jest.Mocked<EmailService>;
    let mockLogger: jest.Mocked<CustomLogger>;

    const mockRegisterDto: RegisterEmailDto = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'Password123!',
    };

    const mockLoginDto: LoginEmailDto = {
        email: 'test@example.com',
        password: 'Password123!',
    };

    beforeAll(async () => 
    {
        mockEmailService = {
            sendEmail: jest.fn(),
            generateVerificationEmail: jest.fn(),
            generatePasswordResetEmail: jest.fn(),
        } as any;

        mockLogger = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
        } as any;

        module = await Test.createTestingModule({
            imports: [
                DatabaseTestHelper.getMongooseTestModule(),
                MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
                JwtModule.register({
                    secret: 'test-secret',
                    signOptions: { expiresIn: '1h' },
                }),
                ConfigModule.forRoot({
                    envFilePath: '.env.test',
                    isGlobal: true,
                }),
                ThrottlerModule.forRoot([
                    {
                        ttl: 60000, // 60 seconds
                        limit: 100, // High limit for tests to avoid interference
                    },
                ]),
                // CommonModule, // Remove CommonModule to avoid real logger
            ],
            controllers: [AuthController],
            providers: [
                AuthService,
                GoogleService,
                UserService,
                {
                    provide: EmailService,
                    useValue: mockEmailService,
                },
                {
                    provide: CustomLogger,
                    useValue: mockLogger,
                },
                {
                    provide: InvitationService,
                    useValue: {},
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => 
                        {
                            const config: Record<string, string> = {
                                JWT_ACCESS_TOKEN_SECRET: 'test-access-secret',
                                JWT_REFRESH_TOKEN_SECRET: 'test-refresh-secret',
                                JWT_ACCESS_TOKEN_EXPIRATION_TIME: '15m',
                                JWT_REFRESH_TOKEN_EXPIRATION_TIME: '7d',
                                // Google OAuth configuration for tests
                                GOOGLE_CLIENT_ID: 'test-google-client-id',
                                GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
                                GOOGLE_REDIRECT_URI: 'http://localhost:3000/oauth/callback',
                            };
                            return config[key];
                        }),
                    },
                },
            ],
        })
            .overrideGuard(ThrottlerGuard)
            .useValue({ canActivate: () => true }) // Bypass throttling for integration tests
            .compile();

        app = module.createNestApplication({
            logger: false, // Disable logging for tests
        });
        app.setGlobalPrefix('api');
        app.useGlobalPipes(new ValidationPipe());
        await app.init();

        userService = module.get<UserService>(UserService);
        connection = module.get<Connection>(getConnectionToken());
    });

    beforeEach(async () => 
    {
        await DatabaseTestHelper.clearDatabase(connection);
        
        // Reset email service mocks
        jest.clearAllMocks();
        
        // Set up mock return values
        mockEmailService.generateVerificationEmail.mockReturnValue({
            to: 'test@example.com',
            subject: 'Verify your Barback account',
            text: 'Verification email text',
            html: 'Verification email html',
        });
        
        mockEmailService.sendEmail.mockResolvedValue();
    });

    afterAll(async () => 
    {
        await app.close();
        await module.close();
        await DatabaseTestHelper.stopInMemoryDatabase();
    });

    describe('/auth/register/email (POST)', () => 
    {
        it('should register new user and return tokens', async () => 
        {
            // Act
            const response = await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send(mockRegisterDto)
                .expect(201);

            // Assert - Verify HTTP response contains valid tokens and user data
            expect(response.body).toHaveProperty('access_token');
            expect(response.body).toHaveProperty('refresh_token');
            expect(response.body).toHaveProperty('user');
            expect(typeof response.body.access_token).toBe('string');
            expect(typeof response.body.refresh_token).toBe('string');

            // Verify user data in response
            expect(response.body.user).toHaveProperty('id');
            expect(response.body.user.email).toBe(mockRegisterDto.email);
            expect(response.body.user.firstName).toBe(mockRegisterDto.firstName);
            expect(response.body.user.lastName).toBe(mockRegisterDto.lastName);
            expect(response.body.user.isEmailVerified).toBe(false);

            // Verify user was actually created in database with correct data
            const userInDb = await userService.findByEmail(mockRegisterDto.email);
            expect(userInDb).toBeDefined();
            expect(userInDb).not.toBeNull();
            expect(userInDb!.email).toBe(mockRegisterDto.email);
            expect(userInDb!.firstName).toBe(mockRegisterDto.firstName);
            expect(userInDb!.lastName).toBe(mockRegisterDto.lastName);
            expect(userInDb!.phoneNumber).toBeUndefined(); // Not provided in DTO
            expect(userInDb!.isActive).toBe(true);
            expect(userInDb!.isEmailVerified).toBe(false);
            
            // Verify that verification email was sent
            expect(mockEmailService.generateVerificationEmail).toHaveBeenCalledWith(
                mockRegisterDto.email,
                expect.any(String)
            );
            expect(mockEmailService.sendEmail).toHaveBeenCalled();
        });

        it('should return 409 when user already exists', async () => 
        {
            // Arrange - First registration to create the user
            await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send(mockRegisterDto)
                .expect(201);

            // Act & Assert - Second registration with same email should conflict
            await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send(mockRegisterDto)
                .expect(409);

            // Verify only one user exists in database
            const usersInDb = await userService.findAll(10, 0);
            const sameEmailUsers = usersInDb.filter(u => u.email === mockRegisterDto.email);
            expect(sameEmailUsers).toHaveLength(1);
        });

        it('should return 400 for invalid email format', async () => 
        {
            const invalidDto = { ...mockRegisterDto, email: 'invalid-email' };

            await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send(invalidDto)
                .expect(400);
        });

        it('should return 400 for missing required fields', async () => 
        {
            const incompleteDto = { email: 'test@example.com' };

            await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send(incompleteDto)
                .expect(400);
        });

        it('should return 400 for weak password', async () => 
        {
            const weakPasswordDto = { ...mockRegisterDto, password: '123' };

            await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send(weakPasswordDto)
                .expect(400);
        });
    });

    describe('/auth/login/email (POST)', () => 
    {
        beforeEach(async () => 
        {
            // Create a user for login tests using HTTP endpoint
            await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send(mockRegisterDto)
                .expect(201);
        });

        it('should login with valid credentials and return tokens', async () => 
        {
            // Act
            const response = await request(app.getHttpServer())
                .post('/api/auth/login/email')
                .send(mockLoginDto)
                .expect(200);

            // Assert - Verify HTTP response contains valid tokens and user data
            expect(response.body).toHaveProperty('access_token');
            expect(response.body).toHaveProperty('refresh_token');
            expect(response.body).toHaveProperty('user');
            expect(typeof response.body.access_token).toBe('string');
            expect(typeof response.body.refresh_token).toBe('string');

            // Verify tokens are non-empty strings
            expect(response.body.access_token.length).toBeGreaterThan(0);
            expect(response.body.refresh_token.length).toBeGreaterThan(0);

            // Verify user data in response
            expect(response.body.user).toHaveProperty('id');
            expect(response.body.user.email).toBe(mockLoginDto.email);
            expect(response.body.user.firstName).toBe(mockRegisterDto.firstName);
            expect(response.body.user.lastName).toBe(mockRegisterDto.lastName);
            expect(response.body.user.isEmailVerified).toBe(false);
        });

        it('should return 401 for non-existent user', async () => 
        {
            const nonExistentDto: LoginEmailDto = {
                email: 'nonexistent@example.com',
                password: 'Password123!',
            };

            await request(app.getHttpServer())
                .post('/api/auth/login/email')
                .send(nonExistentDto)
                .expect(401);
        });

        it('should return 401 for incorrect password', async () => 
        {
            const wrongPasswordDto: LoginEmailDto = {
                email: mockLoginDto.email,
                password: 'wrongpassword',
            };

            await request(app.getHttpServer())
                .post('/api/auth/login/email')
                .send(wrongPasswordDto)
                .expect(401);
        });

        it('should return 400 for invalid email format', async () => 
        {
            const invalidDto = { ...mockLoginDto, email: 'invalid-email' };

            await request(app.getHttpServer())
                .post('/api/auth/login/email')
                .send(invalidDto)
                .expect(400);
        });

        it('should return 400 for missing credentials', async () => 
        {
            await request(app.getHttpServer())
                .post('/api/auth/login/email')
                .send({ email: 'test@example.com' })
                .expect(400);

            await request(app.getHttpServer())
                .post('/api/auth/login/email')
                .send({ password: 'Password123!' })
                .expect(400);
        });
    });

    describe('/auth/refresh-token (POST)', () => 
    {
        let validRefreshToken: string;

        beforeEach(async () => 
        {
            // Register user and get refresh token
            const registerResponse = await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send(mockRegisterDto)
                .expect(201);

            validRefreshToken = registerResponse.body.refresh_token;
        });

        it('should refresh tokens with valid refresh token', async () => 
        {
            // Arrange
            const refreshDto: RefreshTokenDto = {
                refresh_token: validRefreshToken,
            };

            // Act
            const response = await request(app.getHttpServer())
                .post('/api/auth/refresh-token')
                .send(refreshDto)
                .expect(200);

            // Assert - Verify HTTP response contains valid new tokens and user data
            expect(response.body).toHaveProperty('access_token');
            expect(response.body).toHaveProperty('refresh_token');
            expect(response.body).toHaveProperty('user');
            expect(typeof response.body.access_token).toBe('string');
            expect(typeof response.body.refresh_token).toBe('string');
            expect(response.body.access_token.length).toBeGreaterThan(0);
            expect(response.body.refresh_token.length).toBeGreaterThan(0);
            
            // Focus on functional outcome: tokens should be valid and usable
            expect(response.body.access_token).toBeDefined();
            expect(response.body.refresh_token).toBeDefined();

            // Verify user data in response
            expect(response.body.user).toHaveProperty('id');
            expect(response.body.user.email).toBe(mockRegisterDto.email);
            expect(response.body.user.firstName).toBe(mockRegisterDto.firstName);
            expect(response.body.user.lastName).toBe(mockRegisterDto.lastName);
            expect(response.body.user.isEmailVerified).toBe(false);
        });

        it('should return 401 for invalid refresh token', async () => 
        {
            const invalidRefreshDto: RefreshTokenDto = {
                refresh_token: 'invalid.refresh.token',
            };

            await request(app.getHttpServer())
                .post('/api/auth/refresh-token')
                .send(invalidRefreshDto)
                .expect(401);
        });

        it('should return 401 for access token instead of refresh token', async () => 
        {
            // Get access token
            const registerResponse = await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send({ ...mockRegisterDto, email: 'another@example.com' })
                .expect(201);

            const invalidRefreshDto: RefreshTokenDto = {
                refresh_token: registerResponse.body.access_token, // Using access token instead
            };

            await request(app.getHttpServer())
                .post('/api/auth/refresh-token')
                .send(invalidRefreshDto)
                .expect(401);
        });

        it('should return 400 for missing refresh token', async () => 
        {
            await request(app.getHttpServer())
                .post('/api/auth/refresh-token')
                .send({})
                .expect(400);
        });

        it('should return 400 for empty refresh token', async () => 
        {
            const emptyRefreshDto: RefreshTokenDto = {
                refresh_token: '',
            };

            await request(app.getHttpServer())
                .post('/api/auth/refresh-token')
                .send(emptyRefreshDto)
                .expect(400);
        });
    });

    describe('/auth/send-verification-email (POST)', () => 
    {
        it('should send verification email for authenticated user', async () => 
        {
            // Arrange - Register and login
            const registerResponse = await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send(mockRegisterDto)
                .expect(201);

            const accessToken = registerResponse.body.access_token;
            jest.clearAllMocks(); // Clear mocks from registration

            // Act - Send verification email (requires authentication)
            const response = await request(app.getHttpServer())
                .post('/api/auth/send-verification-email')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            // Assert
            expect(response.body).toEqual({});
            expect(mockEmailService.generateVerificationEmail).toHaveBeenCalledWith(
                mockRegisterDto.email,
                expect.any(String)
            );
            expect(mockEmailService.sendEmail).toHaveBeenCalled();
        });

        it('should return 401 for unauthenticated request', async () => 
        {
            // Act & Assert - No authorization header
            await request(app.getHttpServer())
                .post('/api/auth/send-verification-email')
                .expect(401);

            expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
        });
    });

    describe('/auth/verify-email (POST)', () => 
    {
        it('should verify email with valid token', async () => 
        {
            // Arrange
            await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send(mockRegisterDto)
                .expect(201);

            const user = await userService.findByEmail(mockRegisterDto.email);
            const token = await userService.generateEmailVerificationToken(user!._id as any);

            // Act
            const response = await request(app.getHttpServer())
                .post('/api/auth/verify-email')
                .send({ token })
                .expect(200);

            // Assert
            expect(response.body).toEqual({});
            
            const updatedUser = await userService.findByEmail(mockRegisterDto.email);
            expect(updatedUser!.isEmailVerified).toBe(true);
        });

        it('should return 400 for invalid token', async () => 
        {
            // Act & Assert
            await request(app.getHttpServer())
                .post('/api/auth/verify-email')
                .send({ token: 'invalid-token' })
                .expect(400);
        });

        it('should return 400 for already verified email', async () => 
        {
            // Arrange
            await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send(mockRegisterDto)
                .expect(201);

            const user = await userService.findByEmail(mockRegisterDto.email);
            const token = await userService.generateEmailVerificationToken(user!._id as any);

            // First verification should succeed
            await request(app.getHttpServer())
                .post('/api/auth/verify-email')
                .send({ token })
                .expect(200);

            // Second verification with same token should fail
            await request(app.getHttpServer())
                .post('/api/auth/verify-email')
                .send({ token })
                .expect(400);
        });

        it('should return 400 for missing token', async () => 
        {
            // Act & Assert
            await request(app.getHttpServer())
                .post('/api/auth/verify-email')
                .send({})
                .expect(400);
        });
    });

    describe('/auth/verify-email/:token (GET)', () => 
    {
        it('should verify email with valid token via GET', async () => 
        {
            // Arrange
            await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send(mockRegisterDto)
                .expect(201);

            const user = await userService.findByEmail(mockRegisterDto.email);
            const token = await userService.generateEmailVerificationToken(user!._id as any);

            // Act
            const response = await request(app.getHttpServer())
                .get(`/api/auth/verify-email/${token}`)
                .expect(200);

            // Assert
            expect(response.body).toEqual({});
            
            const updatedUser = await userService.findByEmail(mockRegisterDto.email);
            expect(updatedUser!.isEmailVerified).toBe(true);
        });

        it('should return 400 for invalid token via GET', async () => 
        {
            // Act & Assert
            await request(app.getHttpServer())
                .get('/api/auth/verify-email/invalid-token')
                .expect(400);
        });

        it('should return 400 for already verified email via GET', async () => 
        {
            // Arrange
            await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send(mockRegisterDto)
                .expect(201);

            const user = await userService.findByEmail(mockRegisterDto.email);
            const token = await userService.generateEmailVerificationToken(user!._id as any);

            // First verification should succeed
            await request(app.getHttpServer())
                .get(`/api/auth/verify-email/${token}`)
                .expect(200);

            // Generate new token and attempt verification - should fail because email already verified
            const newToken = await userService.generateEmailVerificationToken(user!._id as any);
            await request(app.getHttpServer())
                .get(`/api/auth/verify-email/${newToken}`)
                .expect(400);
        });
    });

    describe('/auth/forgot-password (POST)', () => 
    {
        it('should send password reset email for valid user', async () => 
        {
            // Arrange
            await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send(mockRegisterDto)
                .expect(201);

            jest.clearAllMocks(); // Clear mocks from registration
            
            mockEmailService.generatePasswordResetEmail.mockReturnValue({
                to: mockRegisterDto.email,
                subject: 'Reset your Barback password',
                text: 'Password reset email text',
                html: 'Password reset email html',
            });

            // Act
            const response = await request(app.getHttpServer())
                .post('/api/auth/forgot-password')
                .send({ email: mockRegisterDto.email })
                .expect(200);

            // Assert
            expect(response.body).toEqual({});
            expect(mockEmailService.generatePasswordResetEmail).toHaveBeenCalledWith(
                mockRegisterDto.email,
                expect.any(String)
            );
            expect(mockEmailService.sendEmail).toHaveBeenCalled();
        });

        it('should return success for non-existent email (security)', async () => 
        {
            // Act
            const response = await request(app.getHttpServer())
                .post('/api/auth/forgot-password')
                .send({ email: 'nonexistent@example.com' })
                .expect(200);

            // Assert
            expect(response.body).toEqual({});
            expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
        });
    });

    describe('/auth/reset-password (POST)', () => 
    {
        it('should reset password with valid token', async () => 
        {
            // Arrange
            await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send(mockRegisterDto)
                .expect(201);

            const token = await userService.generatePasswordResetToken(mockRegisterDto.email);

            const newPassword = 'NewPassword123!';

            // Act
            const response = await request(app.getHttpServer())
                .post('/api/auth/reset-password')
                .send({ token, newPassword })
                .expect(200);

            // Assert
            expect(response.body).toEqual({});
            
            // Verify password was actually changed by trying to login with new password
            const loginResponse = await request(app.getHttpServer())
                .post('/api/auth/login/email')
                .send({ email: mockRegisterDto.email, password: newPassword })
                .expect(200);

            expect(loginResponse.body).toHaveProperty('access_token');
        });

        it('should return 400 for invalid token', async () => 
        {
            // Act & Assert
            await request(app.getHttpServer())
                .post('/api/auth/reset-password')
                .send({ token: 'invalid-token', newPassword: 'NewPassword123!' })
                .expect(400);
        });

        it('should validate new password strength', async () => 
        {
            // Arrange
            await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send(mockRegisterDto)
                .expect(201);

            const token = await userService.generatePasswordResetToken(mockRegisterDto.email);

            // Act & Assert - weak password should fail validation
            await request(app.getHttpServer())
                .post('/api/auth/reset-password')
                .send({ token, newPassword: 'weak' })
                .expect(400);
        });
    });

    describe('/auth/reset-password/:token (GET)', () => 
    {
        it('should validate reset token', async () => 
        {
            // Arrange
            await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send(mockRegisterDto)
                .expect(201);

            const token = await userService.generatePasswordResetToken(mockRegisterDto.email);

            // Act
            const response = await request(app.getHttpServer())
                .get(`/api/auth/reset-password/${token}`)
                .expect(200);

            // Assert
            expect(response.body).toEqual({});
        });

        it('should return 400 for invalid token', async () => 
        {
            // Act & Assert
            await request(app.getHttpServer())
                .get('/api/auth/reset-password/invalid-token')
                .expect(400);
        });
    });

    describe('Authentication Flow Integration', () => 
    {
        it('should support complete auth flow: register -> login -> refresh', async () => 
        {
            // Step 1: Register
            const registerResponse = await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send(mockRegisterDto)
                .expect(201);

            const initialTokens = registerResponse.body;
            expect(initialTokens).toHaveProperty('access_token');
            expect(initialTokens).toHaveProperty('refresh_token');

            // Step 2: Login
            const loginResponse = await request(app.getHttpServer())
                .post('/api/auth/login/email')
                .send(mockLoginDto)
                .expect(200);

            const loginTokens = loginResponse.body;
            expect(loginTokens).toHaveProperty('access_token');
            expect(loginTokens).toHaveProperty('refresh_token');

            // Step 3: Refresh tokens
            const refreshDto: RefreshTokenDto = {
                refresh_token: loginTokens.refresh_token,
            };

            const refreshResponse = await request(app.getHttpServer())
                .post('/api/auth/refresh-token')
                .send(refreshDto)
                .expect(200);

            const refreshedTokens = refreshResponse.body;
            expect(refreshedTokens).toHaveProperty('access_token');
            expect(refreshedTokens).toHaveProperty('refresh_token');

            // Verify all tokens are functionally valid (can be decoded)
            const initialPayload = jwt.decode(initialTokens.access_token) as any;
            const loginPayload = jwt.decode(loginTokens.access_token) as any;
            const refreshPayload = jwt.decode(refreshedTokens.access_token) as any;
            
            // Verify tokens are valid JWT tokens with expected structure
            expect(initialPayload).toBeTruthy();
            expect(loginPayload).toBeTruthy();
            expect(refreshPayload).toBeTruthy();
            
            // All tokens should be for the same user (functional consistency)
            expect(initialPayload.sub).toBeDefined();
            expect(loginPayload.sub).toBe(initialPayload.sub);
            expect(refreshPayload.sub).toBe(initialPayload.sub);
            
            // Verify all tokens are access tokens (correct type)
            expect(initialPayload.type).toBe('access');
            expect(loginPayload.type).toBe('access');
            expect(refreshPayload.type).toBe('access');
        });
    });

    describe('OAuth Endpoints', () => 
    {
        describe('GET /auth/oauth/google', () => 
        {
            it('should generate Google OAuth URL successfully', async () => 
            {
                const response = await request(app.getHttpServer())
                    .get('/api/auth/oauth/google')
                    .expect(200);

                expect(response.body).toHaveProperty('authUrl');
                expect(response.body).toHaveProperty('state');
                expect(response.body.authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
                expect(response.body.state).toHaveLength(64);
            });
        });

        describe('POST /auth/oauth/google/callback', () => 
        {
            it('should handle invalid authorization code (validation errors)', async () => 
            {
                // Test empty code - should be caught by validation pipe
                await request(app.getHttpServer())
                    .post('/api/auth/oauth/google/callback')
                    .send({ code: '' })
                    .expect(400);

                // Test missing code - should be caught by validation pipe
                await request(app.getHttpServer())
                    .post('/api/auth/oauth/google/callback')
                    .send({})
                    .expect(400);

                // Test non-string code - should be caught by validation pipe
                await request(app.getHttpServer())
                    .post('/api/auth/oauth/google/callback')
                    .send({ code: 123 })
                    .expect(400);

                // Test whitespace-only code - should be caught by validation pipe
                await request(app.getHttpServer())
                    .post('/api/auth/oauth/google/callback')
                    .send({ code: '   ' })
                    .expect(400);
            });

            // Note: Testing the full OAuth flow with external API calls would require
            // mocking axios calls in the GoogleService. This is better tested in unit tests
            // for the GoogleService itself, where we can control the external dependencies.
            // Integration tests here focus on the controller-level behavior and validation.
        });
    });
});
