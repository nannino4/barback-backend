import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { ChangeSubscriptionTierDto } from './dto/change-subscription-tier.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { SubscriptionTier } from './schemas/subscription.schema';
import { createMockSubscription } from '../__tests__/test-utils';

describe('SubscriptionController', () =>
{
    let controller: SubscriptionController;
    let service: SubscriptionService;

    const mockSubscriptionService = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        findByUserId: jest.fn(),
        update: jest.fn(),
        changeTier: jest.fn(),
        cancel: jest.fn(),
        reactivate: jest.fn(),
        remove: jest.fn(),
    };

    beforeEach(async () =>
    {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SubscriptionController],
            providers: [
                {
                    provide: SubscriptionService,
                    useValue: mockSubscriptionService,
                },
            ],
        }).compile();

        controller = module.get<SubscriptionController>(SubscriptionController);
        service = module.get<SubscriptionService>(SubscriptionService);
    });

    afterEach(() =>
    {
        jest.clearAllMocks();
    });

    describe('create', () =>
    {
        it('should create a new subscription', async () =>
        {
            // Arrange
            const createSubscriptionDto: CreateSubscriptionDto = {
                userId: '507f1f77bcf86cd799439011',
                tier: SubscriptionTier.TRIAL,
            };
            const mockSubscription = createMockSubscription(createSubscriptionDto);
            mockSubscriptionService.create.mockResolvedValue(mockSubscription);

            // Act
            const result = await controller.create(createSubscriptionDto);

            // Assert
            expect(service.create).toHaveBeenCalledWith(createSubscriptionDto);
            expect(result).toEqual(mockSubscription);
        });
    });

    describe('findAll', () =>
    {
        it('should return paginated subscriptions with default parameters', async () =>
        {
            // Arrange
            const mockSubscriptions = [createMockSubscription(), createMockSubscription()];
            mockSubscriptionService.findAll.mockResolvedValue(mockSubscriptions);

            // Act
            const result = await controller.findAll();

            // Assert
            expect(service.findAll).toHaveBeenCalledWith(10, 0);
            expect(result).toEqual(mockSubscriptions);
        });

        it('should return paginated subscriptions with custom parameters', async () =>
        {
            // Arrange
            const limit = 5;
            const offset = 20;
            const mockSubscriptions = [createMockSubscription()];
            mockSubscriptionService.findAll.mockResolvedValue(mockSubscriptions);

            // Act
            const result = await controller.findAll(limit, offset);

            // Assert
            expect(service.findAll).toHaveBeenCalledWith(limit, offset);
            expect(result).toEqual(mockSubscriptions);
        });
    });

    describe('findOne', () =>
    {
        it('should return a subscription by id', async () =>
        {
            // Arrange
            const subscriptionId = '507f1f77bcf86cd799439011';
            const mockSubscription = createMockSubscription();
            mockSubscriptionService.findOne.mockResolvedValue(mockSubscription);

            // Act
            const result = await controller.findOne(subscriptionId);

            // Assert
            expect(service.findOne).toHaveBeenCalledWith(subscriptionId);
            expect(result).toEqual(mockSubscription);
        });
    });

    describe('findByUserId', () =>
    {
        it('should return subscription by user id', async () =>
        {
            // Arrange
            const userId = '507f1f77bcf86cd799439011';
            const mockSubscription = createMockSubscription();
            mockSubscriptionService.findByUserId.mockResolvedValue(mockSubscription);

            // Act
            const result = await controller.findByUserId(userId);

            // Assert
            expect(service.findByUserId).toHaveBeenCalledWith(userId);
            expect(result).toEqual(mockSubscription);
        });
    });

    describe('update', () =>
    {
        it('should update a subscription', async () =>
        {
            // Arrange
            const subscriptionId = '507f1f77bcf86cd799439011';
            const updateSubscriptionDto: UpdateSubscriptionDto = {
                price: 19.99,
                autoRenew: false,
            };
            const updatedSubscription = createMockSubscription({ ...updateSubscriptionDto });
            mockSubscriptionService.update.mockResolvedValue(updatedSubscription);

            // Act
            const result = await controller.update(subscriptionId, updateSubscriptionDto);

            // Assert
            expect(service.update).toHaveBeenCalledWith(subscriptionId, updateSubscriptionDto);
            expect(result).toEqual(updatedSubscription);
        });
    });

    describe('changeTier', () =>
    {
        it('should change subscription tier', async () =>
        {
            // Arrange
            const subscriptionId = '507f1f77bcf86cd799439011';
            const changeTierDto: ChangeSubscriptionTierDto = {
                newTier: SubscriptionTier.PREMIUM,
            };
            const updatedSubscription = createMockSubscription({ tier: SubscriptionTier.PREMIUM });
            mockSubscriptionService.changeTier.mockResolvedValue(updatedSubscription);

            // Act
            const result = await controller.changeTier(subscriptionId, changeTierDto);

            // Assert
            expect(service.changeTier).toHaveBeenCalledWith(subscriptionId, changeTierDto);
            expect(result).toEqual(updatedSubscription);
        });
    });

    describe('cancel', () =>
    {
        it('should cancel a subscription', async () =>
        {
            // Arrange
            const subscriptionId = '507f1f77bcf86cd799439011';
            const cancelDto: CancelSubscriptionDto = {
                reason: 'Not needed anymore',
                cancelAt: 'immediately',
            };
            const cancelledSubscription = createMockSubscription({ status: 'suspended' });
            mockSubscriptionService.cancel.mockResolvedValue(cancelledSubscription);

            // Act
            const result = await controller.cancel(subscriptionId, cancelDto);

            // Assert
            expect(service.cancel).toHaveBeenCalledWith(subscriptionId, cancelDto);
            expect(result).toEqual(cancelledSubscription);
        });
    });

    describe('reactivate', () =>
    {
        it('should reactivate a subscription', async () =>
        {
            // Arrange
            const subscriptionId = '507f1f77bcf86cd799439011';
            const reactivatedSubscription = createMockSubscription({ status: 'active' });
            mockSubscriptionService.reactivate.mockResolvedValue(reactivatedSubscription);

            // Act
            const result = await controller.reactivate(subscriptionId);

            // Assert
            expect(service.reactivate).toHaveBeenCalledWith(subscriptionId);
            expect(result).toEqual(reactivatedSubscription);
        });
    });

    describe('remove', () =>
    {
        it('should remove a subscription', async () =>
        {
            // Arrange
            const subscriptionId = '507f1f77bcf86cd799439011';
            const deleteResult = { message: `Subscription with ID "${subscriptionId}" successfully deleted` };
            mockSubscriptionService.remove.mockResolvedValue(deleteResult);

            // Act
            const result = await controller.remove(subscriptionId);

            // Assert
            expect(service.remove).toHaveBeenCalledWith(subscriptionId);
            expect(result).toEqual(deleteResult);
        });
    });
});
