import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoogleService } from './google.service';
import { UserService } from '../../user/user.service';
import { InvitationService } from '../../invitations/invitation.service';
import { CustomLogger } from '../../common/logger/custom.logger';
import { User, AuthProvider } from '../../user/schemas/user.schema';
import { Types } from 'mongoose';
import {
    GoogleConfigurationException,
    GoogleTokenExchangeException,
    GoogleUserInfoException,
    GoogleTokenInvalidException,
    GoogleEmailNotVerifiedException,
    GoogleAccountLinkingException,
} from '../exceptions/oauth.exceptions';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GoogleService', () => 
{
    let service: GoogleService;
    let userService: jest.Mocked<UserService>;
    let invitationService: jest.Mocked<InvitationService>;
    let logger: jest.Mocked<CustomLogger>;

    const mockConfig = {
        GOOGLE_CLIENT_ID: 'test-client-id',
        GOOGLE_CLIENT_SECRET: 'test-client-secret',
        GOOGLE_REDIRECT_URI: 'http://localhost:3000/callback',
    };

    const mockUser = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        authProvider: AuthProvider.GOOGLE,
        googleId: 'google-123',
        isEmailVerified: true,
        profilePictureUrl: 'https://example.com/pic.jpg',
    } as User;

    const mockGoogleUserInfo = {
        id: 'google-123',
        email: 'test@example.com',
        verified_email: true,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/pic.jpg',
    };

    const mockTokenResponse = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
    };

    beforeEach(async () => 
    {
        const mockConfigService = {
            get: jest.fn((key: string) => mockConfig[key as keyof typeof mockConfig]),
        };

        const mockUserService = {
            findByGoogleId: jest.fn(),
            findByEmail: jest.fn(),
            linkGoogleAccount: jest.fn(),
            create: jest.fn(),
        };

        const mockInvitationService = {
            processPendingInvitationsForUser: jest.fn(),
        };

        const mockLogger = {
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GoogleService,
                { provide: ConfigService, useValue: mockConfigService },
                { provide: UserService, useValue: mockUserService },
                { provide: InvitationService, useValue: mockInvitationService },
                { provide: CustomLogger, useValue: mockLogger },
            ],
        }).compile();

        service = module.get<GoogleService>(GoogleService);
        userService = module.get(UserService);
        invitationService = module.get(InvitationService);
        logger = module.get(CustomLogger);
    });

    afterEach(() => 
    {
        jest.clearAllMocks();
    });

    describe('constructor', () => 
    {
        it('should throw GoogleConfigurationException when GOOGLE_CLIENT_ID is missing', async () => 
        {
            const mockConfigMissing = {
                get: jest.fn((key: string) => key === 'GOOGLE_CLIENT_ID' ? undefined : mockConfig[key as keyof typeof mockConfig]),
            };

            await expect(async () => 
            {
                await Test.createTestingModule({
                    providers: [
                        GoogleService,
                        { provide: ConfigService, useValue: mockConfigMissing },
                        { provide: UserService, useValue: userService },
                        { provide: InvitationService, useValue: invitationService },
                        { provide: CustomLogger, useValue: logger },
                    ],
                }).compile();
            }).rejects.toThrow(GoogleConfigurationException);
        });

        it('should initialize successfully with valid configuration', () => 
        {
            expect(service).toBeDefined();
            expect(logger.debug).toHaveBeenCalledWith(
                'GoogleService initialized with valid configuration',
                'GoogleService#constructor'
            );
        });
    });

    describe('generateAuthUrl', () => 
    {
        it('should generate valid auth URL with state', () => 
        {
            const result = service.generateAuthUrl();

            expect(result).toHaveProperty('authUrl');
            expect(result).toHaveProperty('state');
            expect(result.authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
            expect(result.authUrl).toContain('client_id=test-client-id');
            expect(result.authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
            expect(result.state).toHaveLength(64); // 32 bytes = 64 hex chars
        });
    });

    describe('exchangeCodeForTokens', () => 
    {
        it('should successfully exchange code for tokens', async () => 
        {
            mockedAxios.post.mockResolvedValueOnce({ data: mockTokenResponse });

            const result = await service.exchangeCodeForTokens('auth-code');

            expect(result).toEqual(mockTokenResponse);
            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://oauth2.googleapis.com/token',
                expect.objectContaining({
                    client_id: 'test-client-id',
                    client_secret: 'test-client-secret',
                    code: 'auth-code',
                    grant_type: 'authorization_code',
                    redirect_uri: 'http://localhost:3000/callback',
                }),
                expect.objectContaining({
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                })
            );
        });

        it('should throw GoogleTokenExchangeException on API error', async () => 
        {
            mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

            await expect(service.exchangeCodeForTokens('invalid-code')).rejects.toThrow(
                GoogleTokenExchangeException
            );
        });
    });

    describe('getUserInfo', () => 
    {
        it('should successfully get user info', async () => 
        {
            mockedAxios.get.mockResolvedValueOnce({ data: mockGoogleUserInfo });

            const result = await service.getUserInfo('access-token');

            expect(result).toEqual(mockGoogleUserInfo);
            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                { headers: { Authorization: 'Bearer access-token' } }
            );
        });

        it('should throw GoogleEmailNotVerifiedException when email not verified', async () => 
        {
            const unverifiedUserInfo = { ...mockGoogleUserInfo, verified_email: false };
            mockedAxios.get.mockResolvedValueOnce({ data: unverifiedUserInfo });

            await expect(service.getUserInfo('access-token')).rejects.toThrow(
                GoogleEmailNotVerifiedException
            );
        });

        it('should throw GoogleTokenInvalidException on 401 error', async () => 
        {
            const axiosError = {
                isAxiosError: true,
                response: { status: 401 },
            };
            mockedAxios.get.mockRejectedValueOnce(axiosError);
            mockedAxios.isAxiosError.mockReturnValueOnce(true);

            await expect(service.getUserInfo('invalid-token')).rejects.toThrow(
                GoogleTokenInvalidException
            );
        });

        it('should throw GoogleUserInfoException on other errors', async () => 
        {
            mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

            await expect(service.getUserInfo('access-token')).rejects.toThrow(
                GoogleUserInfoException
            );
        });
    });

    describe('findOrCreateUser', () => 
    {
        it('should return existing user found by Google ID', async () => 
        {
            userService.findByGoogleId.mockResolvedValueOnce(mockUser);

            const result = await service.findOrCreateUser(mockGoogleUserInfo);

            expect(result).toEqual(mockUser);
            expect(userService.findByGoogleId).toHaveBeenCalledWith('google-123');
        });

        it('should link Google account to existing email user', async () => 
        {
            const emailUser = { ...mockUser, authProvider: AuthProvider.EMAIL, googleId: undefined } as User;
            const linkedUser = { ...emailUser, googleId: 'google-123' } as User;

            userService.findByGoogleId.mockResolvedValueOnce(null);
            userService.findByEmail.mockResolvedValueOnce(emailUser);
            userService.linkGoogleAccount.mockResolvedValueOnce(linkedUser);

            const result = await service.findOrCreateUser(mockGoogleUserInfo);

            expect(result).toEqual(linkedUser);
            expect(userService.linkGoogleAccount).toHaveBeenCalledWith(
                emailUser,
                'google-123',
                'https://example.com/pic.jpg'
            );
        });

        it('should throw GoogleAccountLinkingException for conflicting auth provider', async () => 
        {
            const otherProviderUser = { ...mockUser, authProvider: 'facebook' as any } as User;

            userService.findByGoogleId.mockResolvedValueOnce(null);
            userService.findByEmail.mockResolvedValueOnce(otherProviderUser);

            await expect(service.findOrCreateUser(mockGoogleUserInfo)).rejects.toThrow(
                GoogleAccountLinkingException
            );
        });

        it('should create new user when no existing user found', async () => 
        {
            userService.findByGoogleId.mockResolvedValueOnce(null);
            userService.findByEmail.mockResolvedValueOnce(null);
            userService.create.mockResolvedValueOnce(mockUser);
            invitationService.processPendingInvitationsForUser.mockResolvedValueOnce();

            const result = await service.findOrCreateUser(mockGoogleUserInfo);

            expect(result).toEqual(mockUser);
            expect(userService.create).toHaveBeenCalledWith({
                googleId: 'google-123',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                profilePictureUrl: 'https://example.com/pic.jpg',
                authProvider: AuthProvider.GOOGLE,
                isEmailVerified: true,
            });
            expect(invitationService.processPendingInvitationsForUser).toHaveBeenCalledWith(
                mockUser._id,
                'test@example.com'
            );
        });

        it('should continue if invitation processing fails', async () => 
        {
            userService.findByGoogleId.mockResolvedValueOnce(null);
            userService.findByEmail.mockResolvedValueOnce(null);
            userService.create.mockResolvedValueOnce(mockUser);
            invitationService.processPendingInvitationsForUser.mockRejectedValueOnce(
                new Error('Invitation service error')
            );

            const result = await service.findOrCreateUser(mockGoogleUserInfo);

            expect(result).toEqual(mockUser);
            expect(logger.warn).toHaveBeenCalledWith(
                `Failed to process pending invitations for Google user: ${mockUser.email}`,
                'GoogleService#findOrCreateUser'
            );
        });
    });
});
