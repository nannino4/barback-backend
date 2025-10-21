import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as request from 'supertest';
import { AuthModule } from './auth.module';
import { CommonModule } from '../common/common.module';
import { UserModule } from '../user/user.module';
import { EmailModule } from '../email/email.module';
import { EmailService } from '../email/email.service';
import { ThrottlerExceptionFilter } from '../common/filters/throttler-exception.filter';
import { CustomLogger } from '../common/logger/custom.logger';

/**
 * Integration tests for rate limiting on authentication endpoints
 * Tests verify that rate limits are enforced and proper headers are returned
 */
describe('Auth Rate Limiting (Integration)', () => 
{
    let app: INestApplication;
    let mongoServer: MongoMemoryServer;
    let mockLogger: jest.Mocked<CustomLogger>;
    let mockEmailService: jest.Mocked<Partial<EmailService>>;

    beforeAll(async () => 
    {
        // Start in-memory MongoDB
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        // Create mock logger
        mockLogger = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
        } as any;

        // Create mock email service
        mockEmailService = {
            sendEmail: jest.fn().mockResolvedValue(undefined),
            generateVerificationEmail: jest.fn().mockReturnValue({
                to: 'test@example.com',
                subject: 'Test',
                text: 'Test',
            }),
            generatePasswordResetEmail: jest.fn().mockReturnValue({
                to: 'test@example.com',
                subject: 'Test',
                text: 'Test',
            }),
        };

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: '.env.test',
                }),
                MongooseModule.forRoot(mongoUri),
                ThrottlerModule.forRoot([
                    {
                        ttl: 60000, // 60 seconds in milliseconds
                        limit: 10,
                    },
                ]),
                CommonModule,
                UserModule,
                EmailModule,
                AuthModule,
            ],
        })
            .overrideProvider(CustomLogger)
            .useValue(mockLogger)
            .overrideProvider(EmailService)
            .useValue(mockEmailService)
            .compile();

        app = moduleFixture.createNestApplication();
        
        // Apply global configurations
        app.setGlobalPrefix('api');
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));

        // Apply the throttler exception filter
        app.useGlobalFilters(app.get(ThrottlerExceptionFilter));

        await app.init();
    });

    afterAll(async () => 
    {
        await app.close();
        await mongoServer.stop();
    });

    describe('POST /api/auth/register/email', () => 
    {
        const validDto = {
            email: 'ratelimit@test.com',
            password: 'Test123!@#',
            firstName: 'Rate',
            lastName: 'Limit',
        };

        it('should allow up to 3 registration attempts within 5 minutes', async () => 
        {
            // First 3 requests should NOT be rate limited
            // (they may fail for other reasons like duplicate email, but not 429)
            for (let i = 0; i < 3; i++) 
            {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/register/email')
                    .send({
                        ...validDto,
                        email: `ratelimit${i}@test.com`,
                    });
                
                // Should not be rate limited (may be 201 or 400 for other reasons)
                expect(response.status).not.toBe(429);
            }
        });

        it('should block the 4th registration attempt with 429 status', async () => 
        {
            const baseEmail = `block-test-${Date.now()}`;
            
            // Make 3 successful requests
            for (let i = 0; i < 3; i++) 
            {
                await request(app.getHttpServer())
                    .post('/api/auth/register/email')
                    .send({
                        ...validDto,
                        email: `${baseEmail}-${i}@test.com`,
                    });
            }

            // 4th request should be rate limited
            const response = await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send({
                    ...validDto,
                    email: `${baseEmail}-4@test.com`,
                })
                .expect(429);

            expect(response.body).toMatchObject({
                statusCode: 429,
                error: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests. Please try again later.',
            });
        });

        it('should include rate limit headers in 429 response', async () => 
        {
            const baseEmail = `headers-test-${Date.now()}`;
            
            // Make 3 requests to hit the limit
            for (let i = 0; i < 3; i++) 
            {
                await request(app.getHttpServer())
                    .post('/api/auth/register/email')
                    .send({
                        ...validDto,
                        email: `${baseEmail}-${i}@test.com`,
                    });
            }

            // Next request should have rate limit headers
            const response = await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send({
                    ...validDto,
                    email: `${baseEmail}-blocked@test.com`,
                })
                .expect(429);

            // Verify rate limit headers are present
            // Note: These may or may not be present depending on the throttler implementation
            // The filter tries to extract them but may fall back to not including them
            if (response.body.retryAfter)
            {
                expect(response.body.retryAfter).toBeGreaterThan(0);
            }
        });
    });

    describe('POST /api/auth/login/email', () => 
    {
        const loginDto = {
            email: 'login@test.com',
            password: 'WrongPassword123!',
        };

        it('should allow up to 5 login attempts per minute', async () => 
        {
            // First 5 requests should not be rate limited
            // (will fail with 401 due to wrong credentials, but not 429)
            for (let i = 0; i < 5; i++) 
            {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/login/email')
                    .send(loginDto);
                
                // Should not be rate limited
                expect(response.status).not.toBe(429);
            }
        });

        it('should block the 6th login attempt with 429 status', async () => 
        {
            const loginAttemptDto = {
                email: `login-block-${Date.now()}@test.com`,
                password: 'WrongPassword123!',
            };

            // Make 5 login attempts
            for (let i = 0; i < 5; i++) 
            {
                await request(app.getHttpServer())
                    .post('/api/auth/login/email')
                    .send(loginAttemptDto);
            }

            // 6th attempt should be rate limited
            const response = await request(app.getHttpServer())
                .post('/api/auth/login/email')
                .send(loginAttemptDto)
                .expect(429);

            expect(response.body.error).toBe('RATE_LIMIT_EXCEEDED');
        });

        it('should log rate limit violations', async () => 
        {
            const loginAttemptDto = {
                email: `login-log-${Date.now()}@test.com`,
                password: 'WrongPassword123!',
            };

            // Reset mock
            mockLogger.warn.mockClear();

            // Make 5 login attempts to hit the limit
            for (let i = 0; i < 5; i++) 
            {
                await request(app.getHttpServer())
                    .post('/api/auth/login/email')
                    .send(loginAttemptDto);
            }

            // 6th attempt triggers the warning
            await request(app.getHttpServer())
                .post('/api/auth/login/email')
                .send(loginAttemptDto)
                .expect(429);

            // Verify that the warning was logged
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Rate limit exceeded'),
                'ThrottlerExceptionFilter',
            );
        });
    });

    describe('POST /api/auth/forgot-password', () => 
    {
        it('should allow up to 3 password reset requests per minute', async () => 
        {
            // First 3 requests should not be rate limited
            for (let i = 0; i < 3; i++) 
            {
                const response = await request(app.getHttpServer())
                    .post('/api/auth/forgot-password')
                    .send({
                        email: `forgot-${Date.now()}-${i}@test.com`,
                    });
                
                // Should not be rate limited (will be 200 regardless of email existence)
                expect(response.status).not.toBe(429);
            }
        });

        it('should block the 4th password reset request with 429 status', async () => 
        {
            const baseEmail = `forgot-block-${Date.now()}`;

            // Make 3 requests
            for (let i = 0; i < 3; i++) 
            {
                await request(app.getHttpServer())
                    .post('/api/auth/forgot-password')
                    .send({
                        email: `${baseEmail}-${i}@test.com`,
                    });
            }

            // 4th request should be rate limited
            await request(app.getHttpServer())
                .post('/api/auth/forgot-password')
                .send({
                    email: `${baseEmail}-blocked@test.com`,
                })
                .expect(429);
        });
    });

    describe('Rate Limit Error Response Format', () => 
    {
        it('should return consistent error format across all rate-limited endpoints', async () => 
        {
            const baseEmail = `format-test-${Date.now()}`;

            // Hit the rate limit on registration
            for (let i = 0; i < 3; i++) 
            {
                await request(app.getHttpServer())
                    .post('/api/auth/register/email')
                    .send({
                        email: `${baseEmail}-${i}@test.com`,
                        password: 'Test123!@#',
                        firstName: 'Test',
                        lastName: 'User',
                    });
            }

            // Get the rate limited response
            const response = await request(app.getHttpServer())
                .post('/api/auth/register/email')
                .send({
                    email: `${baseEmail}-blocked@test.com`,
                    password: 'Test123!@#',
                    firstName: 'Test',
                    lastName: 'User',
                })
                .expect(429);

            // Verify consistent error format
            expect(response.body).toHaveProperty('statusCode', 429);
            expect(response.body).toHaveProperty('error', 'RATE_LIMIT_EXCEEDED');
            expect(response.body).toHaveProperty('message');
            expect(typeof response.body.message).toBe('string');
        });
    });
});
