import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');
const mockedNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

describe('EmailService', () => 
{
    let service: EmailService;
    let mockTransporter: jest.Mocked<any>;

    beforeEach(async () => 
    {
        mockTransporter = {
            sendMail: jest.fn(),
        };

        mockedNodemailer.createTransport.mockReturnValue(mockTransporter);
        mockedNodemailer.getTestMessageUrl.mockReturnValue('https://ethereal.email/message/test');

        const mockConfigService = {
            get: jest.fn((key: string) => 
            {
                switch (key) 
                {
                case 'SMTP_HOST':
                    return 'smtp.ethereal.email';
                case 'SMTP_PORT':
                    return 587;
                case 'SMTP_USER':
                    return 'test@ethereal.email';
                case 'SMTP_PASS':
                    return 'testpass';
                case 'EMAIL_FROM':
                    return 'noreply@barback.app';
                case 'FRONTEND_URL':
                    return 'http://localhost:3001';
                default:
                    return undefined;
                }
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EmailService,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<EmailService>(EmailService);
    });

    afterEach(() => 
    {
        jest.clearAllMocks();
    });

    it('should be defined', () => 
    {
        expect(service).toBeDefined();
    });

    describe('sendEmail', () => 
    {
        it('should send email successfully', async () => 
        {
            const emailOptions = {
                to: 'test@example.com',
                subject: 'Test Subject',
                text: 'Test content',
                html: '<p>Test content</p>',
            };

            mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

            await service.sendEmail(emailOptions);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: 'noreply@barback.app',
                to: 'test@example.com',
                subject: 'Test Subject',
                text: 'Test content',
                html: '<p>Test content</p>',
            });
        });

        it('should throw error when transporter fails', async () => 
        {
            const emailOptions = {
                to: 'test@example.com',
                subject: 'Test Subject',
                text: 'Test content',
            };

            mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

            await expect(service.sendEmail(emailOptions)).rejects.toThrow('Failed to send email');
        });
    });

    describe('generateVerificationEmail', () => 
    {
        it('should generate verification email options', () => 
        {
            const email = 'user@example.com';
            const token = 'verification-token';

            const result = service.generateVerificationEmail(email, token);

            expect(result.to).toBe(email);
            expect(result.subject).toBe('Verify your Barback account');
            expect(result.text).toContain('http://localhost:3001/auth/verify-email?token=verification-token');
            expect(result.html).toContain('http://localhost:3001/auth/verify-email?token=verification-token');
        });
    });

    describe('generatePasswordResetEmail', () => 
    {
        it('should generate password reset email options', () => 
        {
            const email = 'user@example.com';
            const token = 'reset-token';

            const result = service.generatePasswordResetEmail(email, token);

            expect(result.to).toBe(email);
            expect(result.subject).toBe('Reset your Barback password');
            expect(result.text).toContain('http://localhost:3001/auth/reset-password?token=reset-token');
            expect(result.html).toContain('http://localhost:3001/auth/reset-password?token=reset-token');
        });
    });
});
