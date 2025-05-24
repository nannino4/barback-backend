import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { Subscription, SubscriptionTier, SubscriptionStatus } from './schemas/subscription.schema';
import { User } from '../user/schemas/user.schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { ChangeSubscriptionTierDto } from './dto/change-subscription-tier.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { createMockUser, createMockSubscription } from '../__tests__/test-utils';

describe('SubscriptionService', () =>
{
    let service: SubscriptionService;
    let subscriptionModel: any;
    let userModel: any;

    beforeEach(async () =>
    {
        const mockSubscription = createMockSubscription();
        const mockUser = createMockUser();

        subscriptionModel = {
            new: jest.fn().mockResolvedValue(mockSubscription),
            constructor: jest.fn().mockResolvedValue(mockSubscription),
            find: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            findOne: jest.fn(),
            deleteOne: jest.fn(),
            populate: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            exec: jest.fn(),
            save: jest.fn().mockResolvedValue(mockSubscription),
        };

        userModel = {
            findById: jest.fn(),
            exec: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubscriptionService,
                {
                    provide: getModelToken(Subscription.name),
                    useValue: subscriptionModel,
                },
                {
                    provide: getModelToken(User.name),
                    useValue: userModel,
                },
            ],
        }).compile();

        service = module.get<SubscriptionService>(SubscriptionService);
    });

    afterEach(() =>
    {
        jest.clearAllMocks();
    });

    describe('create', () =>
    {
        it('should create a new subscription for a valid user', async () =>
        {
            // Arrange
            const userId = new Types.ObjectId().toString();
            const createSubscriptionDto: CreateSubscriptionDto = {
                userId,
                tier: SubscriptionTier.TRIAL,
            };

            const mockUser = createMockUser({ _id: new Types.ObjectId(userId) });
            const mockSubscription = createMockSubscription({ userId: new Types.ObjectId(userId) });

            userModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockUser),
            });

            subscriptionModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null), // No existing subscription
            });

            subscriptionModel.save = jest.fn().mockResolvedValue(mockSubscription);
            subscriptionModel.constructor = jest.fn().mockImplementation(() => ({
                save: subscriptionModel.save,
            }));

            // Act
            const result = await service.create(createSubscriptionDto);

            // Assert
            expect(userModel.findById).toHaveBeenCalledWith(userId);
            expect(subscriptionModel.findOne).toHaveBeenCalledWith({
                userId: new Types.ObjectId(userId),
                status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING] },
            });
            expect(subscriptionModel.save).toHaveBeenCalled();
            expect(result).toEqual(mockSubscription);
        });

        it('should throw BadRequestException when user not found', async () =>
        {
            // Arrange
            const userId = new Types.ObjectId().toString();
            const createSubscriptionDto: CreateSubscriptionDto = {
                userId,
                tier: SubscriptionTier.TRIAL,
            };

            userModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            // Act & Assert
            await expect(service.create(createSubscriptionDto)).rejects.toThrow(
                new BadRequestException(`User with ID "${userId}" not found.`),
            );
        });

        it('should throw ConflictException when user already has active subscription', async () =>
        {
            // Arrange
            const userId = new Types.ObjectId().toString();
            const createSubscriptionDto: CreateSubscriptionDto = {
                userId,
                tier: SubscriptionTier.TRIAL,
            };

            const mockUser = createMockUser({ _id: new Types.ObjectId(userId) });
            const existingSubscription = createMockSubscription({ userId: new Types.ObjectId(userId) });

            userModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockUser),
            });

            subscriptionModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(existingSubscription),
            });

            // Act & Assert
            await expect(service.create(createSubscriptionDto)).rejects.toThrow(
                new ConflictException(`User "${userId}" already has an active subscription.`),
            );
        });

        it('should apply correct default features for TRIAL tier', async () =>
        {
            // Arrange
            const userId = new Types.ObjectId().toString();
            const createSubscriptionDto: CreateSubscriptionDto = {
                userId,
                tier: SubscriptionTier.TRIAL,
            };

            const mockUser = createMockUser({ _id: new Types.ObjectId(userId) });

            userModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockUser),
            });

            subscriptionModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            subscriptionModel.save = jest.fn().mockResolvedValue({});
            let constructorCallData;
            subscriptionModel.constructor = jest.fn().mockImplementation((data) =>
            {
                constructorCallData = data;
                return { save: subscriptionModel.save };
            });

            // Act
            await service.create(createSubscriptionDto);

            // Assert
            expect(constructorCallData).toMatchObject({
                price: 0,
                currency: 'EUR',
                limits: {
                    maxOrganizations: 1,
                },
            });
        });

        it('should apply correct default features for BASIC tier', async () =>
        {
            // Arrange
            const userId = new Types.ObjectId().toString();
            const createSubscriptionDto: CreateSubscriptionDto = {
                userId,
                tier: SubscriptionTier.BASIC,
            };

            const mockUser = createMockUser({ _id: new Types.ObjectId(userId) });

            userModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockUser),
            });

            subscriptionModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            subscriptionModel.save = jest.fn().mockResolvedValue({});
            let constructorCallData;
            subscriptionModel.constructor = jest.fn().mockImplementation((data) =>
            {
                constructorCallData = data;
                return { save: subscriptionModel.save };
            });

            // Act
            await service.create(createSubscriptionDto);

            // Assert
            expect(constructorCallData).toMatchObject({
                price: 9.99,
                currency: 'EUR',
                limits: {
                    maxOrganizations: 3,
                },
            });
        });
    });

    describe('findOne', () =>
    {
        it('should return subscription when found', async () =>
        {
            // Arrange
            const subscriptionId = new Types.ObjectId().toString();
            const mockSubscription = createMockSubscription({ _id: new Types.ObjectId(subscriptionId) });

            subscriptionModel.findById.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockSubscription),
            });

            // Act
            const result = await service.findOne(subscriptionId);

            // Assert
            expect(subscriptionModel.findById).toHaveBeenCalledWith(subscriptionId);
            expect(result).toEqual(mockSubscription);
        });

        it('should throw BadRequestException for invalid ID format', async () =>
        {
            // Arrange
            const invalidId = 'invalid-id';

            // Act & Assert
            await expect(service.findOne(invalidId)).rejects.toThrow(
                new BadRequestException(`Invalid Subscription ID format: "${invalidId}"`),
            );
        });

        it('should throw NotFoundException when subscription not found', async () =>
        {
            // Arrange
            const subscriptionId = new Types.ObjectId().toString();

            subscriptionModel.findById.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(null),
            });

            // Act & Assert
            await expect(service.findOne(subscriptionId)).rejects.toThrow(
                new NotFoundException(`Subscription with ID "${subscriptionId}" not found`),
            );
        });
    });

    describe('changeTier', () =>
    {
        it('should change subscription tier for active subscription', async () =>
        {
            // Arrange
            const subscriptionId = new Types.ObjectId().toString();
            const changeTierDto: ChangeSubscriptionTierDto = {
                newTier: SubscriptionTier.PREMIUM,
            };

            const existingSubscription = createMockSubscription({
                _id: new Types.ObjectId(subscriptionId),
                status: SubscriptionStatus.ACTIVE,
            });

            const updatedSubscription = createMockSubscription({
                ...existingSubscription,
                tier: SubscriptionTier.PREMIUM,
                price: 29.99,
                limits: { maxOrganizations: 10 },
            });

            subscriptionModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(existingSubscription),
            });

            subscriptionModel.findByIdAndUpdate.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(updatedSubscription),
            });

            // Act
            const result = await service.changeTier(subscriptionId, changeTierDto);

            // Assert
            expect(subscriptionModel.findByIdAndUpdate).toHaveBeenCalledWith(
                subscriptionId,
                expect.objectContaining({
                    tier: SubscriptionTier.PREMIUM,
                    price: 29.99,
                    currency: 'EUR',
                    limits: { maxOrganizations: 10 },
                }),
                { new: true },
            );
            expect(result).toEqual(updatedSubscription);
        });

        it('should throw BadRequestException for non-active subscription', async () =>
        {
            // Arrange
            const subscriptionId = new Types.ObjectId().toString();
            const changeTierDto: ChangeSubscriptionTierDto = {
                newTier: SubscriptionTier.PREMIUM,
            };

            const suspendedSubscription = createMockSubscription({
                _id: new Types.ObjectId(subscriptionId),
                status: SubscriptionStatus.SUSPENDED,
            });

            subscriptionModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(suspendedSubscription),
            });

            // Act & Assert
            await expect(service.changeTier(subscriptionId, changeTierDto)).rejects.toThrow(
                new BadRequestException('Can only change tier for active subscriptions'),
            );
        });
    });

    describe('cancel', () =>
    {
        it('should cancel subscription immediately', async () =>
        {
            // Arrange
            const subscriptionId = new Types.ObjectId().toString();
            const cancelDto: CancelSubscriptionDto = {
                reason: 'Not needed anymore',
                cancelAt: 'immediately',
            };

            const activeSubscription = createMockSubscription({
                _id: new Types.ObjectId(subscriptionId),
                status: SubscriptionStatus.ACTIVE,
            });

            const cancelledSubscription = createMockSubscription({
                ...activeSubscription,
                status: SubscriptionStatus.SUSPENDED,
                autoRenew: false,
            });

            subscriptionModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(activeSubscription),
            });

            subscriptionModel.findByIdAndUpdate.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(cancelledSubscription),
            });

            // Act
            const result = await service.cancel(subscriptionId, cancelDto);

            // Assert
            expect(subscriptionModel.findByIdAndUpdate).toHaveBeenCalledWith(
                subscriptionId,
                {
                    status: SubscriptionStatus.SUSPENDED,
                    autoRenew: false,
                },
                { new: true },
            );
            expect(result).toEqual(cancelledSubscription);
        });

        it('should throw BadRequestException for already suspended subscription', async () =>
        {
            // Arrange
            const subscriptionId = new Types.ObjectId().toString();
            const cancelDto: CancelSubscriptionDto = {
                reason: 'Test cancellation',
            };

            const suspendedSubscription = createMockSubscription({
                _id: new Types.ObjectId(subscriptionId),
                status: SubscriptionStatus.SUSPENDED,
            });

            subscriptionModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(suspendedSubscription),
            });

            // Act & Assert
            await expect(service.cancel(subscriptionId, cancelDto)).rejects.toThrow(
                new BadRequestException('Subscription is already suspended'),
            );
        });
    });

    describe('reactivate', () =>
    {
        it('should reactivate suspended subscription', async () =>
        {
            // Arrange
            const subscriptionId = new Types.ObjectId().toString();

            const suspendedSubscription = createMockSubscription({
                _id: new Types.ObjectId(subscriptionId),
                status: SubscriptionStatus.SUSPENDED,
            });

            const reactivatedSubscription = createMockSubscription({
                ...suspendedSubscription,
                status: SubscriptionStatus.ACTIVE,
                autoRenew: true,
            });

            subscriptionModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(suspendedSubscription),
            });

            subscriptionModel.findByIdAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(reactivatedSubscription),
            });

            // Act
            const result = await service.reactivate(subscriptionId);

            // Assert
            expect(subscriptionModel.findByIdAndUpdate).toHaveBeenCalledWith(
                subscriptionId,
                expect.objectContaining({
                    status: SubscriptionStatus.ACTIVE,
                    autoRenew: true,
                }),
                { new: true },
            );
            expect(result).toEqual(reactivatedSubscription);
        });

        it('should throw BadRequestException for already active subscription', async () =>
        {
            // Arrange
            const subscriptionId = new Types.ObjectId().toString();

            const activeSubscription = createMockSubscription({
                _id: new Types.ObjectId(subscriptionId),
                status: SubscriptionStatus.ACTIVE,
            });

            subscriptionModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(activeSubscription),
            });

            // Act & Assert
            await expect(service.reactivate(subscriptionId)).rejects.toThrow(
                new BadRequestException('Subscription is already active'),
            );
        });
    });
});
