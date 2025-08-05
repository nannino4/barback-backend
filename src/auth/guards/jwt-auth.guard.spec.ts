import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext } from '@nestjs/common';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserService } from '../../user/user.service';
import { User, UserSchema, UserRole, AuthProvider } from '../../user/schemas/user.schema';
import { DatabaseTestHelper } from '../../../test/utils/database.helper';
import { CustomLogger } from '../../common/logger/custom.logger';

describe('JwtAuthGuard - Unit Tests', () => 
{
    let guard: JwtAuthGuard;
    let jwtService: JwtService;
    let userService: UserService;
    let connection: Connection;
    let module: TestingModule;
    let mockLogger: jest.Mocked<CustomLogger>;

    const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
        isActive: true,
        authProvider: AuthProvider.EMAIL,
        isEmailVerified: true,
    };

    const createMockContext = (authHeader?: string): ExecutionContext => 
    {
        const mockRequest = {
            headers: authHeader ? { authorization: authHeader } : {},
        };

        return {
            switchToHttp: () => ({
                getRequest: () => mockRequest,
            }),
        } as ExecutionContext;
    };

    beforeAll(async () => 
    {
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
            ],
            providers: [
                JwtAuthGuard,
                UserService,
                {
                    provide: JwtService,
                    useValue: {
                        verifyAsync: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('test-secret'),
                    },
                },
                {
                    provide: CustomLogger,
                    useValue: mockLogger,
                },
            ],
        }).compile();

        guard = module.get<JwtAuthGuard>(JwtAuthGuard);
        jwtService = module.get<JwtService>(JwtService);
        userService = module.get<UserService>(UserService);
        connection = module.get<Connection>(getConnectionToken());
    });

    beforeEach(async () => 
    {
        await DatabaseTestHelper.clearDatabase(connection);
        jest.clearAllMocks();
    });

    afterAll(async () => 
    {
        await module.close();
        await DatabaseTestHelper.stopInMemoryDatabase();
    });

    describe('canActivate', () => 
    {
        it('should allow access with valid JWT token and attach user to request', async () => 
        {
            // Arrange - Create user in database
            const createdUser = await userService.create({
                email: mockUser.email,
                firstName: mockUser.firstName,
                lastName: mockUser.lastName,
                role: mockUser.role,
                authProvider: mockUser.authProvider,
                isActive: mockUser.isActive,
                isEmailVerified: mockUser.isEmailVerified,
            });

            const mockPayload = {
                sub: createdUser.id,
                email: mockUser.email,
                type: 'access',
            };

            jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);

            const context = createMockContext('Bearer valid-token');

            // Act
            const result = await guard.canActivate(context);

            // Assert - Focus on output: guard should allow access and attach user
            expect(result).toBe(true);
            
            // Verify user was properly attached to request (functional outcome)
            const request = context.switchToHttp().getRequest();
            expect(request.user).toBeDefined();
            expect(request.user.id).toBe(createdUser.id);
            expect(request.user.email).toBe(mockUser.email);
            expect(request.user.role).toBe(mockUser.role);
            expect(request.user.isActive).toBe(mockUser.isActive);
        });

        it('should throw UnauthorizedException if no token provided', async () => 
        {
            const context = createMockContext();

            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
            await expect(guard.canActivate(context)).rejects.toThrow('No token provided');
        });

        it('should throw UnauthorizedException if authorization header is malformed', async () => 
        {
            const context = createMockContext('InvalidHeader');

            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
            await expect(guard.canActivate(context)).rejects.toThrow('No token provided');
        });

        it('should throw UnauthorizedException if token type is not Bearer', async () => 
        {
            const context = createMockContext('Basic dGVzdDp0ZXN0');

            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
            await expect(guard.canActivate(context)).rejects.toThrow('No token provided');
        });

        it('should throw UnauthorizedException if JWT verification fails', async () => 
        {
            jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('Invalid token'));

            const context = createMockContext('Bearer invalid-token');

            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
            await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired token');
        });

        it('should throw UnauthorizedException if token type is not access', async () => 
        {
            const mockPayload = {
                sub: mockUser.id,
                email: mockUser.email,
                type: 'refresh', // Wrong token type
            };

            jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);

            const context = createMockContext('Bearer refresh-token');

            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
            await expect(guard.canActivate(context)).rejects.toThrow('Invalid token type: Must be an access token');
        });

        it('should throw UnauthorizedException if user not found', async () => 
        {
            const mockPayload = {
                sub: '507f1f77bcf86cd799439999', // Non-existent user ID
                email: 'nonexistent@example.com',
                type: 'access',
            };

            jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);

            const context = createMockContext('Bearer valid-token');

            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
            await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired token');
        });

        it('should extract token correctly from authorization header', async () => 
        {
            // Create user in database
            const userData = await userService.create({
                email: mockUser.email,
                firstName: mockUser.firstName,
                lastName: mockUser.lastName,
                role: mockUser.role,
                isActive: mockUser.isActive,
                authProvider: mockUser.authProvider,
                isEmailVerified: mockUser.isEmailVerified,
            });

            const mockPayload = {
                sub: userData.id,
                email: mockUser.email,
                type: 'access',
            };

            jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);

            const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
            const context = createMockContext(`Bearer ${testToken}`);

            await guard.canActivate(context);

            expect(jwtService.verifyAsync).toHaveBeenCalledWith(testToken, {
                secret: 'test-secret',
            });
        });

        it('should handle inactive user gracefully', async () => 
        {
            // Create inactive user in database
            const userData = await userService.create({
                email: mockUser.email,
                firstName: mockUser.firstName,
                lastName: mockUser.lastName,
                role: mockUser.role,
                isActive: false, // Inactive user
                authProvider: mockUser.authProvider,
                isEmailVerified: mockUser.isEmailVerified,
            });

            const mockPayload = {
                sub: userData.id,
                email: mockUser.email,
                type: 'access',
            };

            jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);

            const context = createMockContext('Bearer valid-token');
            const result = await guard.canActivate(context);

            // Guard should still allow access - business logic for checking active status 
            // should be handled by separate guards or services
            expect(result).toBe(true);

            // Verify inactive user was still attached to request
            const request = context.switchToHttp().getRequest();
            expect(request.user).toBeDefined();
            expect(request.user.isActive).toBe(false);
        });
    });

    describe('extractTokenFromHeader', () => 
    {
        it('should extract token from valid Bearer authorization header', () => 
        {
            const request = {
                headers: {
                    authorization: 'Bearer test-token-123',
                },
            } as any;

            const token = (guard as any).extractTokenFromHeader(request);
            expect(token).toBe('test-token-123');
        });

        it('should return undefined for missing authorization header', () => 
        {
            const request = {
                headers: {},
            } as any;

            const token = (guard as any).extractTokenFromHeader(request);
            expect(token).toBeUndefined();
        });

        it('should return undefined for non-Bearer authorization header', () => 
        {
            const request = {
                headers: {
                    authorization: 'Basic dGVzdDp0ZXN0',
                },
            } as any;

            const token = (guard as any).extractTokenFromHeader(request);
            expect(token).toBeUndefined();
        });

        it('should return undefined for malformed authorization header', () => 
        {
            const request = {
                headers: {
                    authorization: 'Bearer',
                },
            } as any;

            const token = (guard as any).extractTokenFromHeader(request);
            expect(token).toBeUndefined();
        });
    });
});
