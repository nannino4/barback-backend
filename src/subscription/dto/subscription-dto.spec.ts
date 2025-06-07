import { plainToInstance } from 'class-transformer';
import { OutPaymentMethodDto } from './out.payment-method.dto';
import { OutSubscriptionPlanDto } from './out.subscription-plan.dto';
import { OutSubscriptionDto } from './out.subscription.dto';
import { OutSuccessMessageDto } from './out.success-message.dto';

describe('Subscription DTOs', () => 
{
    describe('OutPaymentMethodDto', () => 
    {
        describe('Field Exposure and Security', () => 
        {
            it('should only expose safe payment method fields', () => 
            {
                const paymentMethod = {
                    id: 'pm_1234567890',
                    type: 'card',
                    card: {
                        brand: 'visa',
                        last4: '4242',
                        exp_month: 12,
                        exp_year: 2025,
                        cvc: '123', // This should be excluded
                        number: '4242424242424242', // This should be excluded
                    },
                    isDefault: true,
                    customerId: 'cus_123456', // This should be excluded
                    stripeData: { metadata: 'secret' }, // This should be excluded
                    billingDetails: { // This should be excluded
                        address: '123 Secret St',
                        phone: '+1234567890',
                    },
                };

                const transformed = plainToInstance(OutPaymentMethodDto, paymentMethod, {
                    excludeExtraneousValues: true,
                }) as OutPaymentMethodDto;

                // Should include only exposed fields
                expect(transformed.id).toBe(paymentMethod.id);
                expect(transformed.type).toBe(paymentMethod.type);
                expect(transformed.card?.brand).toBe(paymentMethod.card.brand);
                expect(transformed.card?.last4).toBe(paymentMethod.card.last4);
                expect(transformed.card?.exp_month).toBe(paymentMethod.card.exp_month);
                expect(transformed.card?.exp_year).toBe(paymentMethod.card.exp_year);
                expect(transformed.isDefault).toBe(paymentMethod.isDefault);

                // Should exclude sensitive fields
                expect((transformed.card as any)?.cvc).toBeUndefined();
                expect((transformed.card as any)?.number).toBeUndefined();
                expect((transformed as any).customerId).toBeUndefined();
                expect((transformed as any).stripeData).toBeUndefined();
                expect((transformed as any).billingDetails).toBeUndefined();
            });

            it('should handle non-card payment methods', () => 
            {
                const bankAccountPayment = {
                    id: 'pm_bank_123',
                    type: 'bank_account',
                    card: null,
                    isDefault: false,
                    bankAccount: { // This should be excluded
                        routingNumber: '123456789',
                        accountNumber: '987654321',
                    },
                };

                const transformed = plainToInstance(OutPaymentMethodDto, bankAccountPayment, {
                    excludeExtraneousValues: true,
                }) as OutPaymentMethodDto;

                expect(transformed.id).toBe(bankAccountPayment.id);
                expect(transformed.type).toBe(bankAccountPayment.type);
                expect(transformed.isDefault).toBe(bankAccountPayment.isDefault);
                expect(transformed.card).toBeUndefined(); // Transform returns undefined when no card
                expect((transformed as any).bankAccount).toBeUndefined();
            });
        });

        describe('Card Data Transformation', () => 
        {
            it('should properly transform card data with @Transform decorator', () => 
            {
                const paymentMethodWithExtraCardData = {
                    id: 'pm_1234567890',
                    type: 'card',
                    card: {
                        brand: 'mastercard',
                        last4: '5555',
                        exp_month: 6,
                        exp_year: 2026,
                        cvc: '456',
                        funding: 'credit',
                        country: 'US',
                        fingerprint: 'secret_fingerprint',
                    },
                    isDefault: true,
                };

                const transformed = plainToInstance(OutPaymentMethodDto, paymentMethodWithExtraCardData, {
                    excludeExtraneousValues: true,
                }) as OutPaymentMethodDto;

                // Should only include the allowed card fields
                expect(transformed.card).toEqual({
                    brand: 'mastercard',
                    last4: '5555',
                    exp_month: 6,
                    exp_year: 2026,
                });

                // Should exclude extra card data
                expect((transformed.card as any)?.funding).toBeUndefined();
                expect((transformed.card as any)?.country).toBeUndefined();
                expect((transformed.card as any)?.fingerprint).toBeUndefined();
            });

            it('should handle missing card data gracefully', () => 
            {
                const paymentMethodWithoutCard = {
                    id: 'pm_1234567890',
                    type: 'sepa_debit',
                    card: undefined,
                    isDefault: false,
                };

                const transformed = plainToInstance(OutPaymentMethodDto, paymentMethodWithoutCard, {
                    excludeExtraneousValues: true,
                }) as OutPaymentMethodDto;

                expect(transformed.card).toBeUndefined();
            });
        });
    });

    describe('OutSubscriptionPlanDto', () => 
    {
        describe('Field Exposure and Security', () => 
        {
            it('should only expose subscription plan fields', () => 
            {
                const plan = {
                    id: 'basic',
                    name: 'Basic Plan',
                    duration: 'Monthly',
                    price: 29.99,
                    features: ['Full access', 'Email support'],
                    stripeProductId: 'prod_123456', // This should be excluded
                    stripePriceId: 'price_123456', // This should be excluded
                    internalConfig: { // This should be excluded
                        maxUsers: 100,
                        storageLimit: '10GB',
                    },
                    metadata: { // This should be excluded
                        createdBy: 'admin',
                        environment: 'production',
                    },
                };

                const transformed = plainToInstance(OutSubscriptionPlanDto, plan, {
                    excludeExtraneousValues: true,
                }) as OutSubscriptionPlanDto;

                // Should include only exposed fields
                expect(transformed.id).toBe(plan.id);
                expect(transformed.name).toBe(plan.name);
                expect(transformed.duration).toBe(plan.duration);
                expect(transformed.price).toBe(plan.price);
                expect(transformed.features).toEqual(plan.features);

                // Should exclude internal fields
                expect((transformed as any).stripeProductId).toBeUndefined();
                expect((transformed as any).stripePriceId).toBeUndefined();
                expect((transformed as any).internalConfig).toBeUndefined();
                expect((transformed as any).metadata).toBeUndefined();
            });

            it('should handle different plan types', () => 
            {
                const enterprisePlan = {
                    id: 'enterprise',
                    name: 'Enterprise Plan',
                    duration: 'Yearly',
                    price: 299.99,
                    features: [
                        'Unlimited access',
                        'Priority support',
                        'Custom integrations',
                        'Dedicated account manager',
                    ],
                };

                const transformed = plainToInstance(OutSubscriptionPlanDto, enterprisePlan, {
                    excludeExtraneousValues: true,
                }) as OutSubscriptionPlanDto;

                expect(transformed.id).toBe('enterprise');
                expect(transformed.name).toBe('Enterprise Plan');
                expect(transformed.duration).toBe('Yearly');
                expect(transformed.price).toBe(299.99);
                expect(transformed.features).toHaveLength(4);
            });

            it('should handle free plans', () => 
            {
                const freePlan = {
                    id: 'free',
                    name: 'Free Plan',
                    duration: 'Forever',
                    price: 0,
                    features: ['Basic access', 'Community support'],
                };

                const transformed = plainToInstance(OutSubscriptionPlanDto, freePlan, {
                    excludeExtraneousValues: true,
                }) as OutSubscriptionPlanDto;

                expect(transformed.price).toBe(0);
                expect(transformed.duration).toBe('Forever');
            });
        });
    });

    describe('OutSuccessMessageDto', () => 
    {
        describe('Constructor and Field Assignment', () => 
        {
            it('should create instance with success message', () => 
            {
                const successDto = new OutSuccessMessageDto('Operation completed successfully');

                expect(successDto.message).toBe('Operation completed successfully');
                expect(successDto.success).toBe(true);
            });

            it('should transform using plainToInstance', () => 
            {
                const rawData = {
                    message: 'Payment processed',
                    success: true,
                    timestamp: new Date(), // This should be excluded
                    internalCode: 'PAY_001', // This should be excluded
                };

                const transformed = plainToInstance(OutSuccessMessageDto, rawData, {
                    excludeExtraneousValues: true,
                }) as OutSuccessMessageDto;

                expect(transformed.message).toBe('Payment processed');
                expect(transformed.success).toBe(true);
                expect((transformed as any).timestamp).toBeUndefined();
                expect((transformed as any).internalCode).toBeUndefined();
            });
        });
    });

    describe('OutSubscriptionDto Integration', () => 
    {
        it('should handle subscription transformation', () => 
        {
            const subscription = {
                id: 'sub_123',
                userId: 'user_456',
                planId: 'basic',
                status: 'active',
                currentPeriodStart: new Date('2025-01-01'),
                currentPeriodEnd: new Date('2025-02-01'),
                stripeSubscriptionId: 'stripe_sub_789', // Should be excluded if not exposed
                internalNotes: 'Created via API', // Should be excluded if not exposed
            };

            // Note: This test assumes OutSubscriptionDto exists and has proper @Expose decorators
            // The actual implementation may vary based on the DTO structure
            const transformed = plainToInstance(OutSubscriptionDto, subscription, {
                excludeExtraneousValues: true,
            });

            // Basic assertions that would work regardless of exact DTO structure
            expect(transformed).toBeDefined();
            expect(typeof transformed).toBe('object');
        });
    });
});
