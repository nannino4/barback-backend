import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from '../user/user.service';
import { OrgService } from '../org/org.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { User, UserSchema } from '../user/schemas/user.schema';
import { Org, OrgSchema } from '../org/schemas/org.schema';
import { UserOrg, UserOrgSchema } from '../org/schemas/user-org.schema';
import { Subscription, SubscriptionSchema } from '../subscription/schemas/subscription.schema';
import { DatabaseTestSetup } from './test-utils';
import { OrgRole } from '../org/schemas/user-org.schema';
import { SubscriptionTier } from '../subscription/schemas/subscription.schema';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { CreateOrgDto } from '../org/dto/create-org.dto';
import { CreateSubscriptionDto } from '../subscription/dto/create-subscription.dto';
import { ChangeSubscriptionTierDto } from '../subscription/dto/change-subscription-tier.dto';
import { CancelSubscriptionDto } from '../subscription/dto/cancel-subscription.dto';
import mongoose, { Types } from 'mongoose';

describe('Integration Tests', () =>
{
    let module: TestingModule;
    let userService: UserService;
    let orgService: OrgService;
    let subscriptionService: SubscriptionService;
    let dbSetup: DatabaseTestSetup;

    beforeAll(async () =>
    {
        dbSetup = new DatabaseTestSetup();
        await dbSetup.setup();

        module = await Test.createTestingModule({
            imports: [
                MongooseModule.forRoot(dbSetup.getConnectionString()),
                MongooseModule.forFeature([
                    { name: User.name, schema: UserSchema },
                    { name: Org.name, schema: OrgSchema },
                    { name: UserOrg.name, schema: UserOrgSchema },
                    { name: Subscription.name, schema: SubscriptionSchema },
                ]),
            ],
            providers: [UserService, OrgService, SubscriptionService],
        }).compile();

        userService = module.get<UserService>(UserService);
        orgService = module.get<OrgService>(OrgService);
        subscriptionService = module.get<SubscriptionService>(SubscriptionService);
    });

    afterAll(async () =>
    {
        await module.close();
        await dbSetup.teardown();
    });

    beforeEach(async () =>
    {
        await dbSetup.clearDatabase();
    });

    const createMockUser = (overrides: Partial<CreateUserDto> = {}): CreateUserDto => ({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        hashedPassword: 'password123',
        ...overrides,
    });

    const createMockOrg = (overrides: Partial<CreateOrgDto> = {}): CreateOrgDto => ({
        name: 'Test Bar',
        ownerId: new mongoose.Types.ObjectId().toString(),
        ...overrides,
    });

    describe('User-Organization Integration', () =>
    {
        it('should create user and add them to organization', async () =>
        {
            // Arrange
            const userData = createMockUser({
                email: 'integration@test.com',
                firstName: 'Integration',
                lastName: 'Test',
            });

            // Act - Create user
            const user = await userService.create(userData);
            expect(user._id).toBeDefined();

            // Create organization with the user as owner
            const orgData = createMockOrg({
                name: 'Integration Test Org',
                ownerId: (user._id as Types.ObjectId).toString(),
            });
            const org = await orgService.create(orgData);

            // Assert - Organization should be created and user automatically added as owner
            const userOrgs = await orgService.getUsersInOrg((org._id as Types.ObjectId).toString());
            expect(userOrgs).toHaveLength(1);
            expect(userOrgs[0].userId.toString()).toBe((user._id as Types.ObjectId).toString());
            expect(userOrgs[0].role).toBe(OrgRole.OWNER);
        });

        it('should handle user removal from organization', async () =>
        {
            // Arrange
            const user1 = await userService.create(createMockUser({ email: 'user1@test.com' }));
            const user2 = await userService.create(createMockUser({ email: 'user2@test.com' }));

            const orgData = createMockOrg({
                name: 'Multi-User Org',
                ownerId: (user1._id as Types.ObjectId).toString(),
            });
            const org = await orgService.create(orgData);

            // Add second user
            await orgService.addUserToOrg((org._id as Types.ObjectId).toString(), (user2._id as Types.ObjectId).toString(), OrgRole.STAFF);

            // Act - Remove user2
            await orgService.removeUserFromOrg((org._id as Types.ObjectId).toString(), (user2._id as Types.ObjectId).toString());

            // Assert
            const orgUsers = await orgService.getUsersInOrg((org._id as Types.ObjectId).toString());
            expect(orgUsers).toHaveLength(1);
            expect(orgUsers[0].userId.toString()).toBe((user1._id as Types.ObjectId).toString());
        });

        it('should update user roles in organization', async () =>
        {
            // Arrange
            const user = await userService.create(createMockUser({ email: 'roletest@test.com' }));
            const user2 = await userService.create(createMockUser({ email: 'roletest2@test.com' }));
            const orgData = createMockOrg({
                name: 'Role Test Org',
                ownerId: (user._id as Types.ObjectId).toString(),
            });
            const org = await orgService.create(orgData);

            await orgService.addUserToOrg((org._id as Types.ObjectId).toString(), (user2._id as Types.ObjectId).toString(), OrgRole.STAFF);

            // Act - Promote user2 to manager
            const updatedUserOrg = await orgService.updateUserRoleInOrg(
                (org._id as Types.ObjectId).toString(),
                (user2._id as Types.ObjectId).toString(),
                OrgRole.MANAGER
            );

            // Assert
            expect(updatedUserOrg.role).toBe(OrgRole.MANAGER);
        });
    });

    describe('User-Subscription Integration', () =>
    {
        it('should create user with subscription', async () =>
        {
            // Arrange
            const userData = createMockUser({
                email: 'subscription@test.com',
                firstName: 'Sub',
                lastName: 'Test',
            });

            // Act - Create user
            const user = await userService.create(userData);

            // Create subscription for user
            const subscriptionData: CreateSubscriptionDto = {
                userId: (user._id as Types.ObjectId).toString(),
                tier: SubscriptionTier.PREMIUM,
                startDate: new Date().toISOString(),
            };

            const subscription = await subscriptionService.create(subscriptionData);

            // Assert
            expect(subscription.userId.toString()).toBe((user._id as Types.ObjectId).toString());
            expect(subscription.tier).toBe(SubscriptionTier.PREMIUM);
        });

        it('should handle subscription tier changes', async () =>
        {
            // Arrange
            const user = await userService.create(createMockUser({ email: 'tierchange@test.com' }));
            const subscriptionData: CreateSubscriptionDto = {
                userId: (user._id as Types.ObjectId).toString(),
                tier: SubscriptionTier.BASIC,
                startDate: new Date().toISOString(),
            };

            const subscription = await subscriptionService.create(subscriptionData);

            // Act - Change tier
            const changeTierDto: ChangeSubscriptionTierDto = {
                newTier: SubscriptionTier.PREMIUM,
            };
            const updatedSubscription = await subscriptionService.changeTier(
                (subscription._id as Types.ObjectId).toString(),
                changeTierDto
            );

            // Assert
            expect(updatedSubscription.tier).toBe(SubscriptionTier.PREMIUM);
        });

        it('should handle subscription cancellation and reactivation', async () =>
        {
            // Arrange
            const user = await userService.create(createMockUser({ email: 'cancel@test.com' }));
            const subscriptionData: CreateSubscriptionDto = {
                userId: (user._id as Types.ObjectId).toString(),
                tier: SubscriptionTier.PREMIUM,
                startDate: new Date().toISOString(),
            };

            const subscription = await subscriptionService.create(subscriptionData);

            // Act - Cancel subscription
            const cancelDto: CancelSubscriptionDto = {
                reason: 'Test cancellation',
                cancelAt: 'immediately',
            };
            const cancelledSubscription = await subscriptionService.cancel(
                (subscription._id as Types.ObjectId).toString(),
                cancelDto
            );

            // Assert cancellation
            expect(cancelledSubscription.status).toBe('suspended');

            // Act - Reactivate subscription
            const reactivatedSubscription = await subscriptionService.reactivate((subscription._id as Types.ObjectId).toString());

            // Assert reactivation
            expect(reactivatedSubscription.status).toBe('active');
        });
    });

    describe('Organization-Subscription Integration', () =>
    {
        it('should handle organization with multiple users and subscription', async () =>
        {
            // Arrange
            const owner = await userService.create(createMockUser({ email: 'owner@test.com' }));
            const member1 = await userService.create(createMockUser({ email: 'member1@test.com' }));
            const member2 = await userService.create(createMockUser({ email: 'member2@test.com' }));

            // Create organization
            const orgData = createMockOrg({
                name: 'Team Organization',
                ownerId: (owner._id as Types.ObjectId).toString(),
            });
            const org = await orgService.create(orgData);

            // Add users to organization
            await orgService.addUserToOrg((org._id as Types.ObjectId).toString(), (member1._id as Types.ObjectId).toString(), OrgRole.MANAGER);
            await orgService.addUserToOrg((org._id as Types.ObjectId).toString(), (member2._id as Types.ObjectId).toString(), OrgRole.STAFF);

            // Create subscription for organization owner
            const subscriptionData: CreateSubscriptionDto = {
                userId: (owner._id as Types.ObjectId).toString(),
                tier: SubscriptionTier.PREMIUM,
                startDate: new Date().toISOString(),
            };
            const subscription = await subscriptionService.create(subscriptionData);

            // Act - Get organization users
            const orgUsers = await orgService.getUsersInOrg((org._id as Types.ObjectId).toString());

            // Assert
            expect(orgUsers).toHaveLength(3); // owner + 2 members
            expect(subscription.userId.toString()).toBe((owner._id as Types.ObjectId).toString());
            expect(subscription.tier).toBe(SubscriptionTier.PREMIUM);
        });

        it('should handle organization cleanup when removing users', async () =>
        {
            // Arrange
            const owner = await userService.create(createMockUser({ email: 'cleanup@test.com' }));
            const member = await userService.create(createMockUser({ email: 'member@test.com' }));

            const orgData = createMockOrg({
                name: 'Cleanup Test Org',
                ownerId: (owner._id as Types.ObjectId).toString(),
            });
            const org = await orgService.create(orgData);

            // Add member
            await orgService.addUserToOrg((org._id as Types.ObjectId).toString(), (member._id as Types.ObjectId).toString(), OrgRole.STAFF);

            // Verify initial state
            let orgUsers = await orgService.getUsersInOrg((org._id as Types.ObjectId).toString());
            expect(orgUsers).toHaveLength(2); // owner + member

            // Act - Remove member
            await orgService.removeUserFromOrg((org._id as Types.ObjectId).toString(), (member._id as Types.ObjectId).toString());

            // Assert
            orgUsers = await orgService.getUsersInOrg((org._id as Types.ObjectId).toString());
            expect(orgUsers).toHaveLength(1);
            expect(orgUsers[0].userId.toString()).toBe((owner._id as Types.ObjectId).toString());
        });
    });

    describe('Complex Data Operations', () =>
    {
        it('should handle user with multiple organizations and subscription', async () =>
        {
            // Arrange
            const user = await userService.create(createMockUser({
                email: 'multiorg@test.com',
                firstName: 'Multi',
                lastName: 'Org',
            }));

            // Create multiple organizations
            const org1 = await orgService.create(createMockOrg({
                name: 'Organization 1',
                ownerId: (user._id as Types.ObjectId).toString(),
            }));

            const user2 = await userService.create(createMockUser({ email: 'user2@test.com' }));
            const org2 = await orgService.create(createMockOrg({
                name: 'Organization 2',
                ownerId: (user2._id as Types.ObjectId).toString(),
            }));

            // Add user to second organization with different role
            await orgService.addUserToOrg((org2._id as Types.ObjectId).toString(), (user._id as Types.ObjectId).toString(), OrgRole.MANAGER);

            // Create subscription
            const subscription = await subscriptionService.create({
                userId: (user._id as Types.ObjectId).toString(),
                tier: SubscriptionTier.PREMIUM,
                startDate: new Date().toISOString(),
            });

            // Act - Verify data integrity
            const retrievedUser = await userService.findOne((user._id as Types.ObjectId).toString());
            const org1Users = await orgService.getUsersInOrg((org1._id as Types.ObjectId).toString());
            const org2Users = await orgService.getUsersInOrg((org2._id as Types.ObjectId).toString());
            const userSubscription = await subscriptionService.findOne((subscription._id as Types.ObjectId).toString());

            // Assert
            expect((retrievedUser._id as Types.ObjectId).toString()).toBe((user._id as Types.ObjectId).toString());
            expect(org1Users.some(u => u.userId.toString() === (user._id as Types.ObjectId).toString())).toBe(true);
            expect(org2Users.some(u => u.userId.toString() === (user._id as Types.ObjectId).toString())).toBe(true);
            expect(userSubscription.userId.toString()).toBe((user._id as Types.ObjectId).toString());
        });
    });

    describe('Error Handling in Integration', () =>
    {
        it('should handle duplicate email creation', async () =>
        {
            // Arrange
            const userData = createMockUser({ email: 'duplicate@test.com' });
            await userService.create(userData);

            // Act & Assert
            await expect(userService.create(userData)).rejects.toThrow();
        });

        it('should handle invalid ObjectId references', async () =>
        {
            // Arrange
            const invalidId = new mongoose.Types.ObjectId().toString();

            // Act & Assert
            await expect(orgService.findOne(invalidId)).rejects.toThrow();
            await expect(subscriptionService.findOne(invalidId)).rejects.toThrow();
        });

        it('should handle adding non-existent user to organization', async () =>
        {
            // Arrange
            const user = await userService.create(createMockUser({ email: 'exists@test.com' }));
            const org = await orgService.create(createMockOrg({
                name: 'Test Org',
                ownerId: (user._id as Types.ObjectId).toString(),
            }));
            const nonExistentUserId = new mongoose.Types.ObjectId().toString();

            // Act & Assert
            await expect(orgService.addUserToOrg(
                (org._id as Types.ObjectId).toString(),
                nonExistentUserId,
                OrgRole.STAFF
            )).rejects.toThrow();
        });
    });
});
