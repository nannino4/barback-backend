import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrgSubscriptionGuard } from './org-subscription.guard';
import { SubscriptionService } from '../../subscription/subscription.service';
import { OrgService } from '../org.service';
import { SubscriptionStatus } from '../../subscription/schemas/subscription.schema';
import { CustomLogger } from '../../common/logger/custom.logger';

describe('OrgSubscriptionGuard', () => 
{
    let guard: OrgSubscriptionGuard;
    let subscriptionService: jest.Mocked<SubscriptionService>;
    let orgService: jest.Mocked<OrgService>;

    const mockUser = {
        _id: new Types.ObjectId(),
        email: 'test@example.com',
    };

    const mockOrg = {
        _id: new Types.ObjectId(),
        name: 'Test Org',
        subscriptionId: new Types.ObjectId(),
        ownerId: mockUser._id,
    };

    const mockActiveSubscription = {
        _id: mockOrg.subscriptionId,
        userId: mockUser._id,
        status: SubscriptionStatus.ACTIVE,
    };

    const mockTrialingSubscription = {
        _id: mockOrg.subscriptionId,
        userId: mockUser._id,
        status: SubscriptionStatus.TRIALING,
    };

    const mockInactiveSubscription = {
        _id: mockOrg.subscriptionId,
        userId: mockUser._id,
        status: SubscriptionStatus.CANCELED,
    };

    const createMockExecutionContext = (orgId?: string, user?: any): ExecutionContext => ({
        switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({
                user: user,
                params: orgId ? { orgId: orgId, id: orgId } : {},
            }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
        getType: jest.fn(),
    } as any);

    beforeEach(async () => 
    {
        const mockSubscriptionService = {
            findById: jest.fn(),
        };

        const mockOrgService = {
            findById: jest.fn(),
        };

        const mockLogger = {
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrgSubscriptionGuard,
                { provide: SubscriptionService, useValue: mockSubscriptionService },
                { provide: OrgService, useValue: mockOrgService },
                { provide: CustomLogger, useValue: mockLogger },
            ],
        }).compile();

        guard = module.get<OrgSubscriptionGuard>(OrgSubscriptionGuard);
        subscriptionService = module.get(SubscriptionService);
        orgService = module.get(OrgService);
    });

    afterEach(() => 
    {
        jest.clearAllMocks();
    });

    describe('canActivate', () => 
    {
        it('should return true for organization with active subscription', async () => 
        {
            orgService.findById.mockResolvedValue(mockOrg as any);
            subscriptionService.findById.mockResolvedValue(mockActiveSubscription as any);

            const context = createMockExecutionContext(mockOrg._id.toString(), mockUser);
            const result = await guard.canActivate(context);

            expect(result).toBe(true);
            expect(orgService.findById).toHaveBeenCalledWith(mockOrg._id);
            expect(subscriptionService.findById).toHaveBeenCalledWith(mockOrg.subscriptionId);
        });

        it('should return true for organization with trialing subscription', async () => 
        {
            orgService.findById.mockResolvedValue(mockOrg as any);
            subscriptionService.findById.mockResolvedValue(mockTrialingSubscription as any);

            const context = createMockExecutionContext(mockOrg._id.toString(), mockUser);
            const result = await guard.canActivate(context);

            expect(result).toBe(true);
        });

        it('should throw ForbiddenException when user is not in request', async () => 
        {
            const context = createMockExecutionContext(mockOrg._id.toString(), null);

            await expect(guard.canActivate(context)).rejects.toThrow(
                new ForbiddenException('User information not available')
            );
        });

        it('should throw ForbiddenException when orgId is missing', async () => 
        {
            const context = createMockExecutionContext(undefined, mockUser);

            await expect(guard.canActivate(context)).rejects.toThrow(
                new ForbiddenException('Organization ID is required')
            );
        });

        it('should throw BadRequestException for invalid ObjectId format', async () => 
        {
            const context = createMockExecutionContext('invalid-id', mockUser);

            await expect(guard.canActivate(context)).rejects.toThrow(
                new BadRequestException('Invalid organization ID format')
            );
        });

        it('should throw ForbiddenException when organization is not found', async () => 
        {
            orgService.findById.mockResolvedValue(null);

            const context = createMockExecutionContext(mockOrg._id.toString(), mockUser);

            await expect(guard.canActivate(context)).rejects.toThrow(
                new ForbiddenException('Organization not found')
            );
        });

        it('should throw ForbiddenException when subscription is not found', async () => 
        {
            orgService.findById.mockResolvedValue(mockOrg as any);
            subscriptionService.findById.mockResolvedValue(null as any);

            const context = createMockExecutionContext(mockOrg._id.toString(), mockUser);

            await expect(guard.canActivate(context)).rejects.toThrow(
                new ForbiddenException('Organization subscription not found')
            );
        });

        it('should throw ForbiddenException when subscription is inactive', async () => 
        {
            orgService.findById.mockResolvedValue(mockOrg as any);
            subscriptionService.findById.mockResolvedValue(mockInactiveSubscription as any);

            const context = createMockExecutionContext(mockOrg._id.toString(), mockUser);

            await expect(guard.canActivate(context)).rejects.toThrow(
                new ForbiddenException('Organization subscription is not active')
            );
        });

        it('should handle service errors gracefully', async () => 
        {
            orgService.findById.mockRejectedValue(new Error('Database error'));

            const context = createMockExecutionContext(mockOrg._id.toString(), mockUser);

            await expect(guard.canActivate(context)).rejects.toThrow(
                new ForbiddenException('Unable to verify organization subscription status')
            );
        });
    });
});
