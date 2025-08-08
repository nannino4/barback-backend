import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { User, UserSchema, UserRole, AuthProvider } from '../user/schemas/user.schema';
import { RegisterEmailDto } from './dto/in.register-email.dto';
import { DatabaseTestHelper } from '../../test/utils/database.helper';
import { EmailService } from '../email/email.service';
import { InvitationService } from '../invitation/invitation.service';
import { CustomLogger } from '../common/logger/custom.logger';
import * as bcrypt from 'bcrypt';
import {
    InvalidRefreshTokenException,
    InvalidCredentialsException,
    WrongAuthProviderException,
} from './exceptions/auth.exceptions';
import {
    EmailAlreadyExistsException,
    UserNotFoundByEmailException,
    EmailAlreadyVerifiedException,
    InvalidEmailVerificationTokenException,
    InvalidPasswordResetTokenException,
} from '../user/exceptions/user.exceptions';

describe('AuthService - Service Tests (Unit-style)', () => 
{
    let service: AuthService;
    let userService: UserService;
    let jwtService: JwtService;
    let connection: Connection;
    let module: TestingModule;
    let mockEmailService: jest.Mocked<EmailService>;
    let mockLogger: jest.Mocked<CustomLogger>;

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
            ],
            providers: [
                AuthService,
                UserService,
                {
                    provide: EmailService,
                    useValue: mockEmailService,
                },
                {
                    provide: InvitationService,
                    useValue: {},
                },
                {
                    provide: CustomLogger,
                    useValue: mockLogger,
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
        }).compile();

        service = module.get<AuthService>(AuthService);
        userService = module.get<UserService>(UserService);
        jwtService = module.get<JwtService>(JwtService);
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
            expect(result.user).toBeDefined();
            expect(typeof result.access_token).toBe('string');
            expect(typeof result.refresh_token).toBe('string');

            // Verify the tokens are valid JWTs with correct payload
            const decodedAccess = jwtService.decode(result.access_token) as any;
            const decodedRefresh = jwtService.decode(result.refresh_token) as any;
            
            expect(decodedAccess.sub).toBe(createdUser.id);
            expect(decodedAccess.type).toBe('access');
            expect(decodedRefresh.sub).toBe(createdUser.id);
            expect(decodedRefresh.type).toBe('refresh');

            // Verify user data in response
            expect(result.user.id).toBe(createdUser.id);
            expect(result.user.email).toBe(createdUser.email);
            expect(result.user.firstName).toBe(createdUser.firstName);
            expect(result.user.lastName).toBe(createdUser.lastName);
            expect(result.user.phoneNumber).toBe(createdUser.phoneNumber);
            expect(result.user.isEmailVerified).toBe(createdUser.isEmailVerified);

            // Verify the tokens can be verified (are functionally valid)
            expect(() => jwtService.verify(result.access_token, { 
                secret: 'test-access-secret', 
            })).not.toThrow();
            expect(() => jwtService.verify(result.refresh_token, { 
                secret: 'test-refresh-secret', 
            })).not.toThrow();
        });

        it('should throw InvalidRefreshTokenException for invalid refresh token', async () => 
        {
            // Arrange
            const invalidToken = 'invalid.token.here';

            // Act & Assert
            await expect(service.validateRefreshToken(invalidToken)).rejects.toThrow(InvalidRefreshTokenException);
        });

        it('should throw InvalidRefreshTokenException for access token instead of refresh token', async () => 
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
            await expect(service.validateRefreshToken(tokens.access_token)).rejects.toThrow(InvalidRefreshTokenException);
        });

        it('should throw InvalidRefreshTokenException for refresh token of non-existent user', async () => 
        {
            // Arrange
            const tokens = await service.generateTokens(mockUser);

            // Act & Assert
            await expect(service.validateRefreshToken(tokens.refresh_token)).rejects.toThrow(InvalidRefreshTokenException);
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
            expect(result.user).toBeDefined();

            // Verify user data in response
            expect(result.user.email).toBe(mockUser.email);
            expect(result.user.firstName).toBe(mockUser.firstName);
            expect(result.user.lastName).toBe(mockUser.lastName);
            expect(result.user.phoneNumber).toBe(mockUser.phoneNumber);
        });

        it('should throw InvalidCredentialsException for non-existent user', async () => 
        {
            // Act & Assert
            await expect(service.loginEmail('nonexistent@example.com', 'password123'))
                .rejects.toThrow(InvalidCredentialsException);
        });

        it('should throw InvalidCredentialsException for incorrect password', async () => 
        {
            // Act & Assert
            await expect(service.loginEmail(mockUser.email, 'wrongpassword'))
                .rejects.toThrow(InvalidCredentialsException);
        });

        it('should throw WrongAuthProviderException for user with non-EMAIL auth provider', async () => 
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
                .rejects.toThrow(WrongAuthProviderException);
        });

        it('should throw InvalidCredentialsException for user without password', async () => 
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
                .rejects.toThrow(InvalidCredentialsException);
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
            expect(result.user).toBeDefined();

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

            // Verify user data in response
            expect(result.user.id).toBe(createdUser!.id);
            expect(result.user.email).toBe(createdUser!.email);
            expect(result.user.firstName).toBe(createdUser!.firstName);
            expect(result.user.lastName).toBe(createdUser!.lastName);
            expect(result.user.phoneNumber).toBe(createdUser!.phoneNumber);
            expect(result.user.isEmailVerified).toBe(createdUser!.isEmailVerified);
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
            expect(result.user).toBeDefined();

            const createdUser = await userService.findByEmail(dtoWithoutPhone.email);
            expect(createdUser).toBeDefined();
            expect(createdUser).not.toBeNull();
            expect(createdUser!.phoneNumber).toBeUndefined();

            // Verify user data in response
            expect(result.user.id).toBe(createdUser!.id);
            expect(result.user.email).toBe(createdUser!.email);
            expect(result.user.phoneNumber).toBeUndefined();
        });

        it('should throw EmailAlreadyExistsException when user already exists', async () => 
        {
            // Arrange
            await service.registerEmail(mockRegisterEmailDto);

            // Act & Assert
            await expect(service.registerEmail(mockRegisterEmailDto)).rejects.toThrow(EmailAlreadyExistsException);
        });

        it('should throw EmailAlreadyExistsException when user exists with different auth provider', async () => 
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
            await expect(service.registerEmail(mockRegisterEmailDto)).rejects.toThrow(EmailAlreadyExistsException);
        });
    });

    describe('sendVerificationEmail', () => 
    {
        it('should send verification email to existing user', async () => 
        {
            // Arrange
            const user = await userService.create({
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                hashedPassword: 'hashedPassword',
                role: UserRole.USER,
                authProvider: AuthProvider.EMAIL,
                isEmailVerified: false,
            });

            mockEmailService.generateVerificationEmail.mockReturnValue({
                to: user.email,
                subject: 'Verify your Barback account',
                text: 'Verification email text',
                html: 'Verification email html',
            });

            // Act
            await service.sendVerificationEmail(user.email);

            // Assert
            expect(mockEmailService.generateVerificationEmail).toHaveBeenCalledWith(user.email, expect.any(String));
            expect(mockEmailService.sendEmail).toHaveBeenCalled();
        });

        it('should throw UserNotFoundByEmailException when user not found', async () => 
        {
            // Act & Assert
            await expect(service.sendVerificationEmail('nonexistent@example.com')).rejects.toThrow(UserNotFoundByEmailException);
        });

        it('should throw EmailAlreadyVerifiedException when user is already verified', async () => 
        {
            // Arrange
            await userService.create({
                email: 'verified@example.com',
                firstName: 'John',
                lastName: 'Doe',
                hashedPassword: 'hashedPassword',
                role: UserRole.USER,
                authProvider: AuthProvider.EMAIL,
                isEmailVerified: true,
            });

            // Act & Assert
            await expect(service.sendVerificationEmail('verified@example.com')).rejects.toThrow(EmailAlreadyVerifiedException);
        });
    });

    describe('verifyEmail', () => 
    {
        it('should verify email with valid token', async () => 
        {
            // Arrange
            const user = await userService.create({
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                hashedPassword: 'hashedPassword',
                role: UserRole.USER,
                authProvider: AuthProvider.EMAIL,
                isEmailVerified: false,
            });

            const token = await userService.generateEmailVerificationToken(new Types.ObjectId(user.id));

            // Act
            await service.verifyEmail(token);

            // Assert
            const updatedUser = await userService.findById(new Types.ObjectId(user.id));
            expect(updatedUser.isEmailVerified).toBe(true);
            expect(updatedUser.emailVerificationToken).toBeUndefined();
        });

        it('should throw InvalidEmailVerificationTokenException with invalid token', async () => 
        {
            // Act & Assert
            await expect(service.verifyEmail('invalid-token')).rejects.toThrow(InvalidEmailVerificationTokenException);
        });
    });

    describe('forgotPassword', () => 
    {
        it('should send password reset email for valid email user', async () => 
        {
            // Arrange
            const user = await userService.create({
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                hashedPassword: 'hashedPassword',
                role: UserRole.USER,
                authProvider: AuthProvider.EMAIL,
            });

            mockEmailService.generatePasswordResetEmail.mockReturnValue({
                to: user.email,
                subject: 'Reset your Barback password',
                text: 'Password reset email text',
                html: 'Password reset email html',
            });

            // Act
            await service.forgotPassword(user.email);

            // Assert
            expect(mockEmailService.generatePasswordResetEmail).toHaveBeenCalledWith(user.email, expect.any(String));
            expect(mockEmailService.sendEmail).toHaveBeenCalled();
        });

        it('should not throw error for non-existent email', async () => 
        {
            // Act & Assert
            await expect(service.forgotPassword('nonexistent@example.com')).resolves.not.toThrow();
            expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
        });

        it('should not send email for non-EMAIL auth provider', async () => 
        {
            // Arrange
            await userService.create({
                email: 'google@example.com',
                firstName: 'Google',
                lastName: 'User',
                role: UserRole.USER,
                authProvider: AuthProvider.GOOGLE,
            });

            // Act
            await service.forgotPassword('google@example.com');

            // Assert
            expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
        });
    });

    describe('resetPassword', () => 
    {
        it('should reset password with valid token', async () => 
        {
            // Arrange
            const user = await userService.create({
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                hashedPassword: await bcrypt.hash('oldPassword', 10),
                role: UserRole.USER,
                authProvider: AuthProvider.EMAIL,
            });

            const token = await userService.generatePasswordResetToken(user.email);
            const newPassword = 'newPassword123';

            // Act
            await service.resetPassword(token!, newPassword);

            // Assert
            const updatedUser = await userService.findById(new Types.ObjectId(user.id));
            expect(updatedUser.passwordResetToken).toBeUndefined();
            expect(await bcrypt.compare(newPassword, updatedUser.hashedPassword!)).toBe(true);
        });

        it('should throw InvalidPasswordResetTokenException with invalid token', async () => 
        {
            // Act & Assert
            await expect(service.resetPassword('invalid-token', 'newPassword')).rejects.toThrow(InvalidPasswordResetTokenException);
        });
    });
});
