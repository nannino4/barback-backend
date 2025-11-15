import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { UserService } from '../user/user.service';
import { User, UserSchema } from '../user/schemas/user.schema';
import { Subscription, SubscriptionSchema, SubscriptionStatus } from './schemas/subscription.schema';
import { DatabaseTestHelper } from '../../test/utils/database.helper';
import { CustomLogger } from '../common/logger/custom.logger';
import { StripeService } from '../common/services/stripe.service';
import { EmailService } from '../email/email.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/guards/email-verified.guard';

describe('SubscriptionController - Integration Tests', () =>
{
    let app: INestApplication;
    let userService: UserService;
    let subscriptionService: SubscriptionService;
    let connection: Connection;
    let module: TestingModule;
    let mockLogger: jest.Mocked<CustomLogger>;
    let mockStripeService: jest.Mocked<StripeService>;
    let mockEmailService: jest.Mocked<EmailService>;

    let testUserId: Types.ObjectId;
    let testUser: User;

    beforeAll(async () =>
    {
        mockLogger = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
        } as any;

        mockStripeService = {
            createCustomer: jest.fn(),
            createSubscription: jest.fn(),
            cancelSubscription: jest.fn(),
        } as any;

        mockEmailService = {
            sendEmail: jest.fn(),
            generateVerificationEmail: jest.fn(),
            generatePasswordResetEmail: jest.fn(),
        } as any;

        module = await Test.createTestingModule({
            imports: [
                DatabaseTestHelper.getMongooseTestModule(),
                MongooseModule.forFeature([
                    { name: User.name, schema: UserSchema },
                    { name: Subscription.name, schema: SubscriptionSchema },
                ]),
                JwtModule.register({}),
                ConfigModule.forRoot({
                    envFilePath: '.env.test',
                    isGlobal: true,
                }),
            ],
            controllers: [SubscriptionController],
            providers: [
                SubscriptionService,
                UserService,
                {
                    provide: CustomLogger,
                    useValue: mockLogger,
                },
                {
                    provide: StripeService,
                    useValue: mockStripeService,
                },
                {
                    provide: EmailService,
                    useValue: mockEmailService,
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
                            };
                            return config[key];
                        }),
                    },
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: () => true, // Will be overridden in beforeEach
            })
            .overrideGuard(EmailVerifiedGuard)
            .useValue({
                canActivate: () => true, // Will be overridden in tests
            })
            .compile();

        app = module.createNestApplication({
            logger: false,
        });
        app.setGlobalPrefix('api');
        app.useGlobalPipes(new ValidationPipe());
        await app.init();

        userService = module.get<UserService>(UserService);
        subscriptionService = module.get<SubscriptionService>(SubscriptionService);
        connection = module.get<Connection>(getConnectionToken());
    });

    beforeEach(async () =>
    {
        await DatabaseTestHelper.clearDatabase(connection);
        jest.clearAllMocks();

        // Create test user with hashed password and verified email
        const hashedPassword = await bcrypt.hash('Password123!', 10);
        testUser = await userService.create({
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            hashedPassword,
            isEmailVerified: true,
        });
        testUserId = testUser._id as Types.ObjectId;

        // Override JwtAuthGuard to attach test user to request
        const jwtGuard = app.get(JwtAuthGuard);
        jest.spyOn(jwtGuard, 'canActivate').mockImplementation(async (context) =>
        {
            const request = context.switchToHttp().getRequest();
            const freshUser = await userService.findById(testUserId);
            request.user = freshUser;
            return true;
        });

        // Override EmailVerifiedGuard to check email verification
        const emailGuard = app.get(EmailVerifiedGuard);
        jest.spyOn(emailGuard, 'canActivate').mockImplementation((context) =>
        {
            const request = context.switchToHttp().getRequest();
            const user = request.user;
            return user && user.isEmailVerified === true;
        });
    });

    afterAll(async () =>
    {
        await app.close();
        await module.close();
        await DatabaseTestHelper.stopInMemoryDatabase();
    });

    describe('/subscriptions/stripe/:stripeSubscriptionId (GET)', () =>
    {
        it('should return subscription status for owned subscription', async () =>
        {
            // Arrange - Create subscription for test user
            const stripeSubscriptionId = 'sub_test123';
            await subscriptionService.createFromStripeSubscription(
                {
                    id: stripeSubscriptionId,
                    status: 'active',
                } as any,
                testUserId
            );

            // Act
            const response = await request(app.getHttpServer())
                .get(`/api/subscriptions/stripe/${stripeSubscriptionId}`)
                .expect(200);

            // Assert
            expect(response.body).toHaveProperty('stripeSubscriptionId', stripeSubscriptionId);
            expect(response.body).toHaveProperty('status', SubscriptionStatus.ACTIVE);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                expect.stringContaining(`Getting Stripe subscription status for user: ${testUserId}`),
                'SubscriptionController#getStripeSubscriptionStatus'
            );
        });

        it('should return 409 when user tries to access subscription they do not own', async () =>
        {
            // Arrange - Create another user and subscription
            const hashedPassword = await bcrypt.hash('Password123!', 10);
            const otherUser = await userService.create({
                email: 'other@example.com',
                firstName: 'Other',
                lastName: 'User',
                hashedPassword,
            });
            const otherUserId = otherUser._id as Types.ObjectId;

            const stripeSubscriptionId = 'sub_other123';
            await subscriptionService.createFromStripeSubscription(
                {
                    id: stripeSubscriptionId,
                    status: 'active',
                } as any,
                otherUserId
            );

            // Act & Assert
            const response = await request(app.getHttpServer())
                .get(`/api/subscriptions/stripe/${stripeSubscriptionId}`)
                .expect(409);

            // Verify error response
            expect(response.body).toHaveProperty('error', 'SUBSCRIPTION_OWNERSHIP_MISMATCH');
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('does not belong to the current user');

            // Verify warning was logged
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining(`User: ${testUserId} attempted to access subscription`),
                'SubscriptionController#getStripeSubscriptionStatus'
            );
        });

        it('should return 404 when subscription does not exist', async () =>
        {
            // Arrange
            const nonExistentSubscriptionId = 'sub_nonexistent';

            // Act & Assert
            const response = await request(app.getHttpServer())
                .get(`/api/subscriptions/stripe/${nonExistentSubscriptionId}`)
                .expect(404);

            // Verify error response
            expect(response.body).toHaveProperty('error', 'SUBSCRIPTION_NOT_FOUND');
            expect(response.body).toHaveProperty('message');
        });

        it('should return 403 when not authenticated', async () =>
        {
            // Arrange
            const stripeSubscriptionId = 'sub_test123';
            await subscriptionService.createFromStripeSubscription(
                {
                    id: stripeSubscriptionId,
                    status: 'active',
                } as any,
                testUserId
            );

            // Mock guards to deny access (no user attached)
            const jwtGuard = app.get(JwtAuthGuard);
            jest.spyOn(jwtGuard, 'canActivate').mockImplementation(async () =>
            {
                return false; // Simulate no authentication
            });

            // Act & Assert
            await request(app.getHttpServer())
                .get(`/api/subscriptions/stripe/${stripeSubscriptionId}`)
                .expect(403);
        });

        it('should return 403 when email is not verified', async () =>
        {
            // Arrange - Create unverified user
            const hashedPassword = await bcrypt.hash('Password123!', 10);
            const unverifiedUser = await userService.create({
                email: 'unverified@example.com',
                firstName: 'Unverified',
                lastName: 'User',
                hashedPassword,
                // isEmailVerified is false by default
            });
            const unverifiedUserId = unverifiedUser._id as Types.ObjectId;

            const stripeSubscriptionId = 'sub_test123';
            await subscriptionService.createFromStripeSubscription(
                {
                    id: stripeSubscriptionId,
                    status: 'active',
                } as any,
                unverifiedUserId
            );

            // Mock JWT guard to attach unverified user
            const jwtGuard = app.get(JwtAuthGuard);
            jest.spyOn(jwtGuard, 'canActivate').mockImplementation(async (context) =>
            {
                const request = context.switchToHttp().getRequest();
                request.user = unverifiedUser;
                return true;
            });

            // Email guard should now fail
            const emailGuard = app.get(EmailVerifiedGuard);
            jest.spyOn(emailGuard, 'canActivate').mockImplementation((context) =>
            {
                const request = context.switchToHttp().getRequest();
                const user = request.user;
                return user && user.isEmailVerified === true; // Will return false
            });

            // Act & Assert
            await request(app.getHttpServer())
                .get(`/api/subscriptions/stripe/${stripeSubscriptionId}`)
                .expect(403);
        });

        it('should handle different subscription statuses correctly', async () =>
        {
            // Arrange & Act & Assert for TRIALING
            const trialingSubId = 'sub_trialing';
            await subscriptionService.createFromStripeSubscription(
                {
                    id: trialingSubId,
                    status: 'trialing',
                } as any,
                testUserId
            );

            const trialingResponse = await request(app.getHttpServer())
                .get(`/api/subscriptions/stripe/${trialingSubId}`)
                .expect(200);

            expect(trialingResponse.body.status).toBe(SubscriptionStatus.TRIALING);

            // Arrange & Act & Assert for CANCELED
            const canceledSubId = 'sub_canceled';
            await subscriptionService.createFromStripeSubscription(
                {
                    id: canceledSubId,
                    status: 'canceled',
                } as any,
                testUserId
            );

            const canceledResponse = await request(app.getHttpServer())
                .get(`/api/subscriptions/stripe/${canceledSubId}`)
                .expect(200);

            expect(canceledResponse.body.status).toBe(SubscriptionStatus.CANCELED);

            // Arrange & Act & Assert for PAST_DUE
            const pastDueSubId = 'sub_past_due';
            await subscriptionService.createFromStripeSubscription(
                {
                    id: pastDueSubId,
                    status: 'past_due',
                } as any,
                testUserId
            );

            const pastDueResponse = await request(app.getHttpServer())
                .get(`/api/subscriptions/stripe/${pastDueSubId}`)
                .expect(200);

            expect(pastDueResponse.body.status).toBe(SubscriptionStatus.PAST_DUE);
        });
    });
});
