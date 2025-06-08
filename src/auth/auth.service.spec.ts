import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { User, UserSchema, UserRole, AuthProvider } from '../user/schemas/user.schema';
import { RegisterEmailDto } from './dto/in.register-email.dto';
import { DatabaseTestHelper } from '../../test/utils/database.helper';
import * as bcrypt from 'bcrypt';

describe('AuthService - Service Tests (Unit-style)', () => 
{
    let service: AuthService;
    let userService: UserService;
    let jwtService: JwtService;
    let connection: Connection;
    let module: TestingModule;

    const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
        hashedPassword: '$2b$10$hashedPassword',
        role: UserRole.USER,
        authProvider: AuthProvider.EMAIL,
        isActive: true,
        isEmailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    } as any;

    const mockRegisterEmailDto: RegisterEmailDto = {
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        password: 'password123',
        phoneNumber: '+1987654321',
    };

    beforeAll(async () => 
    {
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
            ],
            providers: [
                AuthService,
                UserService,
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
        }).compile();

        service = module.get<AuthService>(AuthService);
        userService = module.get<UserService>(UserService);
        jwtService = module.get<JwtService>(JwtService);
        connection = module.get<Connection>(getConnectionToken());
    });

    beforeEach(async () => 
    {
        await DatabaseTestHelper.clearDatabase(connection);
    });

    afterAll(async () => 
    {
        await module.close();
        await DatabaseTestHelper.stopInMemoryDatabase();
    });

    it('should be defined', () => 
    {
        expect(service).toBeDefined();
    });

    describe('generateTokens', () => 
    {
        it('should generate valid JWT tokens that can authenticate the user', async () => 
        {
            // Arrange
            const testUser = await userService.create({
                email: mockUser.email,
                firstName: mockUser.firstName,
                lastName: mockUser.lastName,
                phoneNumber: mockUser.phoneNumber,
                hashedPassword: mockUser.hashedPassword,
                role: mockUser.role,
                authProvider: mockUser.authProvider,
            });

            // Act
            const result = await service.generateTokens(testUser);

            // Assert - Test the output format and structure
            expect(result).toBeDefined();
            expect(result.access_token).toBeDefined();
            expect(result.refresh_token).toBeDefined();
            expect(typeof result.access_token).toBe('string');
            expect(typeof result.refresh_token).toBe('string');

            // Test that tokens are actually valid JWTs with expected payload
            const decodedAccess = jwtService.decode(result.access_token) as any;
            const decodedRefresh = jwtService.decode(result.refresh_token) as any;
            
            expect(decodedAccess.sub).toBe(testUser.id);
            expect(decodedAccess.type).toBe('access');
            expect(decodedRefresh.sub).toBe(testUser.id);
            expect(decodedRefresh.type).toBe('refresh');

            // Test that tokens can be verified successfully
            expect(() => jwtService.verify(result.access_token, { 
                secret: 'test-access-secret', 
            })).not.toThrow();
            expect(() => jwtService.verify(result.refresh_token, { 
                secret: 'test-refresh-secret', 
            })).not.toThrow();
        });
    });

    describe('validateRefreshToken', () => 
    {
        it('should return valid tokens for valid refresh token', async () => 
        {
            // Arrange
            const createdUser = await userService.create({
                email: mockUser.email,
                firstName: mockUser.firstName,
                lastName: mockUser.lastName,
                phoneNumber: mockUser.phoneNumber,
                hashedPassword: mockUser.hashedPassword,
                role: mockUser.role,
                authProvider: mockUser.authProvider,
            });

            const tokens = await service.generateTokens(createdUser);

            // Act
            const result = await service.validateRefreshToken(tokens.refresh_token);

            // Assert - Focus on output validation: are the returned tokens valid and functional?
            expect(result).toBeDefined();
            expect(result.access_token).toBeDefined();
            expect(result.refresh_token).toBeDefined();
            expect(typeof result.access_token).toBe('string');
            expect(typeof result.refresh_token).toBe('string');

            // Verify the tokens are valid JWTs with correct payload
            const decodedAccess = jwtService.decode(result.access_token) as any;
            const decodedRefresh = jwtService.decode(result.refresh_token) as any;
            
            expect(decodedAccess.sub).toBe(createdUser.id);
            expect(decodedAccess.type).toBe('access');
            expect(decodedRefresh.sub).toBe(createdUser.id);
            expect(decodedRefresh.type).toBe('refresh');

            // Verify the tokens can be verified (are functionally valid)
            expect(() => jwtService.verify(result.access_token, { 
                secret: 'test-access-secret', 
            })).not.toThrow();
            expect(() => jwtService.verify(result.refresh_token, { 
                secret: 'test-refresh-secret', 
            })).not.toThrow();
        });

        it('should throw UnauthorizedException for invalid refresh token', async () => 
        {
            // Arrange
            const invalidToken = 'invalid.token.here';

            // Act & Assert
            await expect(service.validateRefreshToken(invalidToken)).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException for access token instead of refresh token', async () => 
        {
            // Arrange
            const createdUser = await userService.create({
                email: mockUser.email,
                firstName: mockUser.firstName,
                lastName: mockUser.lastName,
                phoneNumber: mockUser.phoneNumber,
                hashedPassword: mockUser.hashedPassword,
                role: mockUser.role,
                authProvider: mockUser.authProvider,
            });

            const tokens = await service.generateTokens(createdUser);

            // Act & Assert
            await expect(service.validateRefreshToken(tokens.access_token)).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException for refresh token of non-existent user', async () => 
        {
            // Arrange
            const tokens = await service.generateTokens(mockUser);

            // Act & Assert
            await expect(service.validateRefreshToken(tokens.refresh_token)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('loginEmail', () => 
    {
        beforeEach(async () => 
        {
            const hashedPassword = await bcrypt.hash('password123', 10);
            await userService.create({
                email: mockUser.email,
                firstName: mockUser.firstName,
                lastName: mockUser.lastName,
                phoneNumber: mockUser.phoneNumber,
                hashedPassword,
                role: mockUser.role,
                authProvider: AuthProvider.EMAIL,
            });
        });

        it('should return tokens for valid credentials', async () => 
        {
            // Act
            const result = await service.loginEmail(mockUser.email, 'password123');

            // Assert
            expect(result).toBeDefined();
            expect(result.access_token).toBeDefined();
            expect(result.refresh_token).toBeDefined();
        });

        it('should throw UnauthorizedException for non-existent user', async () => 
        {
            // Act & Assert
            await expect(service.loginEmail('nonexistent@example.com', 'password123'))
                .rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException for incorrect password', async () => 
        {
            // Act & Assert
            await expect(service.loginEmail(mockUser.email, 'wrongpassword'))
                .rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException for user with non-EMAIL auth provider', async () => 
        {
            // Arrange
            await userService.create({
                email: 'oauth@example.com',
                firstName: 'OAuth',
                lastName: 'User',
                role: UserRole.USER,
                authProvider: AuthProvider.GOOGLE,
            });

            // Act & Assert
            await expect(service.loginEmail('oauth@example.com', 'password123'))
                .rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException for user without password', async () => 
        {
            // Arrange
            await userService.create({
                email: 'nopass@example.com',
                firstName: 'NoPass',
                lastName: 'User',
                role: UserRole.USER,
                authProvider: AuthProvider.EMAIL,
            });

            // Act & Assert
            await expect(service.loginEmail('nopass@example.com', 'password123'))
                .rejects.toThrow(UnauthorizedException);
        });
    });

    describe('registerEmail', () => 
    {
        it('should create new user and return tokens', async () => 
        {
            // Act
            const result = await service.registerEmail(mockRegisterEmailDto);

            // Assert
            expect(result).toBeDefined();
            expect(result.access_token).toBeDefined();
            expect(result.refresh_token).toBeDefined();

            // Verify user was created in database
            const createdUser = await userService.findByEmail(mockRegisterEmailDto.email);
            expect(createdUser).toBeDefined();
            expect(createdUser).not.toBeNull();
            expect(createdUser!.firstName).toBe(mockRegisterEmailDto.firstName);
            expect(createdUser!.lastName).toBe(mockRegisterEmailDto.lastName);
            expect(createdUser!.phoneNumber).toBe(mockRegisterEmailDto.phoneNumber);
            expect(createdUser!.authProvider).toBe(AuthProvider.EMAIL);
            expect(createdUser!.role).toBe(UserRole.USER);

            // Verify password was hashed
            expect(createdUser!.hashedPassword).toBeDefined();
            expect(createdUser!.hashedPassword).not.toBe(mockRegisterEmailDto.password);
            expect(await bcrypt.compare(mockRegisterEmailDto.password, createdUser!.hashedPassword!)).toBe(true);
        });

        it('should create user without phone number when not provided', async () => 
        {
            // Arrange
            const dtoWithoutPhone = { ...mockRegisterEmailDto };
            delete dtoWithoutPhone.phoneNumber;

            // Act
            const result = await service.registerEmail(dtoWithoutPhone);

            // Assert
            expect(result).toBeDefined();
            expect(result.access_token).toBeDefined();
            expect(result.refresh_token).toBeDefined();

            const createdUser = await userService.findByEmail(dtoWithoutPhone.email);
            expect(createdUser).toBeDefined();
            expect(createdUser).not.toBeNull();
            expect(createdUser!.phoneNumber).toBeUndefined();
        });

        it('should throw ConflictException when user already exists', async () => 
        {
            // Arrange
            await service.registerEmail(mockRegisterEmailDto);

            // Act & Assert
            await expect(service.registerEmail(mockRegisterEmailDto)).rejects.toThrow(ConflictException);
        });

        it('should throw ConflictException when user exists with different auth provider', async () => 
        {
            // Arrange
            await userService.create({
                email: mockRegisterEmailDto.email,
                firstName: 'Existing',
                lastName: 'User',
                role: UserRole.USER,
                authProvider: AuthProvider.GOOGLE,
            });

            // Act & Assert
            await expect(service.registerEmail(mockRegisterEmailDto)).rejects.toThrow(ConflictException);
        });
    });
});
