export class MockFactory
{
    static createStripeCustomer()
    {
        return {
            id: 'cus_test_mock_123',
            email: 'test@example.com',
            created: Math.floor(Date.now() / 1000),
            default_source: null,
            description: null,
            metadata: {},
        };
    }

    static createStripePaymentMethod()
    {
        return {
            id: 'pm_test_mock_123',
            type: 'card',
            card: {
                brand: 'visa',
                last4: '4242',
                exp_month: 12,
                exp_year: 2025,
            },
            customer: 'cus_test_mock_123',
        };
    }

    static createEmailProvider()
    {
        return {
            sendEmail: jest.fn().mockResolvedValue({
                messageId: 'mock-message-id',
                success: true,
            }),
            sendPasswordResetEmail: jest.fn().mockResolvedValue({
                messageId: 'mock-password-reset-id',
                success: true,
            }),
            sendWelcomeEmail: jest.fn().mockResolvedValue({
                messageId: 'mock-welcome-id',  
                success: true,
            }),
        };
    }

    static createExternalApiClient()
    {
        return {
            get: jest.fn().mockResolvedValue({ data: {} }),
            post: jest.fn().mockResolvedValue({ data: {} }),
            put: jest.fn().mockResolvedValue({ data: {} }),
            delete: jest.fn().mockResolvedValue({ data: {} }),
        };
    }
}
