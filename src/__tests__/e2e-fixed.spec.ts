import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import * as request from 'supertest';
import { UserModule } from '../user/user.module';
import { OrgModule } from '../org/org.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { DatabaseTestSetup } from './test-utils';
import { OrgRole } from '../org/schemas/user-org.schema';
import { SubscriptionTier } from '../subscription/schemas/subscription.schema';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { CreateOrgDto } from '../org/dto/create-org.dto';
import { CreateSubscriptionDto } from '../subscription/dto/create-subscription.dto';
import mongoose from 'mongoose';

describe('E2E Tests', () => {
    let app: INestApplication;
    let dbSetup: DatabaseTestSetup;

    beforeAll(async () => {
        dbSetup = new DatabaseTestSetup();
        await dbSetup.setup();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                MongooseModule.forRoot(dbSetup.getConnectionString()),
                UserModule,
                OrgModule,
                SubscriptionModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
        await dbSetup.teardown();
    });

    beforeEach(async () => {
        await dbSetup.clearDatabase();
    });

    const createMockUser = (overrides: Partial<CreateUserDto> = {}): CreateUserDto => ({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        ...overrides,
    });

    const createMockOrg = (overrides: Partial<CreateOrgDto> = {}): CreateOrgDto => ({
        name: 'Test Bar',
        ownerId: new mongoose.Types.ObjectId().toString(),
        ...overrides,
    });

    describe('User Registration and Profile Management Journey', () => {
        it('should complete full user registration flow', async () => {
            const userData = createMockUser({
                email: 'e2e@test.com',
                firstName: 'E2E',
                lastName: 'Test',
            });

            // Create user
            const createResponse = await request(app.getHttpServer())
                .post('/users')
                .send(userData)
                .expect(201);

            expect(createResponse.body.email).toBe(userData.email);
            expect(createResponse.body.firstName).toBe(userData.firstName);
            expect(createResponse.body.lastName).toBe(userData.lastName);
            expect(createResponse.body._id).toBeDefined();

            const userId = createResponse.body._id;

            // Retrieve user
            const getResponse = await request(app.getHttpServer())
                .get(`/users/${userId}`)
                .expect(200);

            expect(getResponse.body._id).toBe(userId);
            expect(getResponse.body.email).toBe(userData.email);

            // Update user
            const updateData = {
                firstName: 'Updated',
                lastName: 'Name',
            };

            const updateResponse = await request(app.getHttpServer())
                .patch(`/users/${userId}`)
                .send(updateData)
                .expect(200);

            expect(updateResponse.body.firstName).toBe('Updated');
            expect(updateResponse.body.lastName).toBe('Name');
            expect(updateResponse.body.email).toBe(userData.email); // Should remain unchanged

            // Delete user
            await request(app.getHttpServer())
                .delete(`/users/${userId}`)
                .expect(200);

            // Verify user is deleted
            await request(app.getHttpServer())
                .get(`/users/${userId}`)
                .expect(404);
        });

        it('should prevent duplicate email registration', async () => {
            const userData = createMockUser({ email: 'duplicate@test.com' });

            // First user creation should succeed
            await request(app.getHttpServer())
                .post('/users')
                .send(userData)
                .expect(201);

            // Second user creation with same email should fail
            await request(app.getHttpServer())
                .post('/users')
                .send(userData)
                .expect(400);
        });

        it('should handle invalid user data validation', async () => {
            // Test missing required fields
            await request(app.getHttpServer())
                .post('/users')
                .send({})
                .expect(400);

            // Test invalid email format
            await request(app.getHttpServer())
                .post('/users')
                .send(createMockUser({ email: 'invalid-email' }))
                .expect(400);
        });
    });

    describe('Organization Management Journey', () => {
        it('should complete full organization lifecycle', async () => {
            // First create a user to be the organization owner
            const userResponse = await request(app.getHttpServer())
                .post('/users')
                .send(createMockUser({ email: 'orgowner@test.com' }))
                .expect(201);

            const ownerId = userResponse.body._id;

            // Create organization
            const orgData = createMockOrg({
                name: 'E2E Test Organization',
                ownerId: ownerId,
            });

            const createOrgResponse = await request(app.getHttpServer())
                .post('/organizations')
                .send(orgData)
                .expect(201);

            expect(createOrgResponse.body.name).toBe(orgData.name);
            expect(createOrgResponse.body.ownerId).toBe(ownerId);
            const orgId = createOrgResponse.body._id;

            // Get organization
            const getOrgResponse = await request(app.getHttpServer())
                .get(`/organizations/${orgId}`)
                .expect(200);

            expect(getOrgResponse.body._id).toBe(orgId);
            expect(getOrgResponse.body.name).toBe(orgData.name);

            // Update organization
            const updateOrgData = { name: 'Updated Organization Name' };
            const updateOrgResponse = await request(app.getHttpServer())
                .patch(`/organizations/${orgId}`)
                .send(updateOrgData)
                .expect(200);

            expect(updateOrgResponse.body.name).toBe('Updated Organization Name');

            // Delete organization
            await request(app.getHttpServer())
                .delete(`/organizations/${orgId}`)
                .expect(200);

            // Verify organization is deleted
            await request(app.getHttpServer())
                .get(`/organizations/${orgId}`)
                .expect(404);
        });

        it('should manage users in organization', async () => {
            // Create users
            const ownerResponse = await request(app.getHttpServer())
                .post('/users')
                .send(createMockUser({ email: 'owner@test.com' }))
                .expect(201);

            const memberResponse = await request(app.getHttpServer())
                .post('/users')
                .send(createMockUser({ email: 'member@test.com' }))
                .expect(201);

            const ownerId = ownerResponse.body._id;
            const memberId = memberResponse.body._id;

            // Create organization
            const orgData = createMockOrg({
                name: 'User Management Org',
                ownerId: ownerId,
            });

            const orgResponse = await request(app.getHttpServer())
                .post('/organizations')
                .send(orgData)
                .expect(201);

            const orgId = orgResponse.body._id;

            // Add user to organization
            const addUserData = {
                userId: memberId,
                role: OrgRole.STAFF,
            };

            await request(app.getHttpServer())
                .post(`/organizations/${orgId}/users`)
                .send(addUserData)
                .expect(201);

            // Get users in organization
            const usersResponse = await request(app.getHttpServer())
                .get(`/organizations/${orgId}/users`)
                .expect(200);

            expect(usersResponse.body).toHaveLength(2); // owner + member

            // Update user role
            const updateRoleData = { role: OrgRole.MANAGER };
            await request(app.getHttpServer())
                .patch(`/organizations/${orgId}/users/${memberId}`)
                .send(updateRoleData)
                .expect(200);

            // Remove user from organization
            await request(app.getHttpServer())
                .delete(`/organizations/${orgId}/users/${memberId}`)
                .expect(200);

            // Verify user was removed
            const finalUsersResponse = await request(app.getHttpServer())
                .get(`/organizations/${orgId}/users`)
                .expect(200);

            expect(finalUsersResponse.body).toHaveLength(1); // only owner
        });
    });

    describe('Subscription Management Journey', () => {
        it('should complete subscription lifecycle', async () => {
            // Create user
            const userResponse = await request(app.getHttpServer())
                .post('/users')
                .send(createMockUser({ email: 'subscriber@test.com' }))
                .expect(201);

            const userId = userResponse.body._id;

            // Create subscription
            const subscriptionData: CreateSubscriptionDto = {
                userId: userId,
                tier: SubscriptionTier.BASIC,
                startDate: new Date().toISOString(),
            };

            const createSubResponse = await request(app.getHttpServer())
                .post('/subscriptions')
                .send(subscriptionData)
                .expect(201);

            expect(createSubResponse.body.userId).toBe(userId);
            expect(createSubResponse.body.tier).toBe(SubscriptionTier.BASIC);
            const subscriptionId = createSubResponse.body._id;

            // Get subscription
            const getSubResponse = await request(app.getHttpServer())
                .get(`/subscriptions/${subscriptionId}`)
                .expect(200);

            expect(getSubResponse.body._id).toBe(subscriptionId);

            // Change subscription tier
            const changeTierData = { newTier: SubscriptionTier.PREMIUM };
            const changeTierResponse = await request(app.getHttpServer())
                .patch(`/subscriptions/${subscriptionId}/tier`)
                .send(changeTierData)
                .expect(200);

            expect(changeTierResponse.body.tier).toBe(SubscriptionTier.PREMIUM);

            // Cancel subscription
            const cancelData = {
                reason: 'Test cancellation',
                cancelAt: 'immediately',
            };

            const cancelResponse = await request(app.getHttpServer())
                .patch(`/subscriptions/${subscriptionId}/cancel`)
                .send(cancelData)
                .expect(200);

            expect(cancelResponse.body.status).toBe('suspended');

            // Reactivate subscription
            const reactivateResponse = await request(app.getHttpServer())
                .patch(`/subscriptions/${subscriptionId}/reactivate`)
                .expect(200);

            expect(reactivateResponse.body.status).toBe('active');
        });

        it('should handle subscription tier upgrades and downgrades', async () => {
            // Create user
            const userResponse = await request(app.getHttpServer())
                .post('/users')
                .send(createMockUser({ email: 'tiermanagement@test.com' }))
                .expect(201);

            const userId = userResponse.body._id;

            // Create trial subscription
            const subscriptionData: CreateSubscriptionDto = {
                userId: userId,
                tier: SubscriptionTier.TRIAL,
                startDate: new Date().toISOString(),
            };

            const subResponse = await request(app.getHttpServer())
                .post('/subscriptions')
                .send(subscriptionData)
                .expect(201);

            const subscriptionId = subResponse.body._id;

            // Upgrade to basic
            await request(app.getHttpServer())
                .patch(`/subscriptions/${subscriptionId}/tier`)
                .send({ newTier: SubscriptionTier.BASIC })
                .expect(200);

            // Upgrade to premium
            const premiumResponse = await request(app.getHttpServer())
                .patch(`/subscriptions/${subscriptionId}/tier`)
                .send({ newTier: SubscriptionTier.PREMIUM })
                .expect(200);

            expect(premiumResponse.body.tier).toBe(SubscriptionTier.PREMIUM);

            // Downgrade to basic
            const downgradeResponse = await request(app.getHttpServer())
                .patch(`/subscriptions/${subscriptionId}/tier`)
                .send({ newTier: SubscriptionTier.BASIC })
                .expect(200);

            expect(downgradeResponse.body.tier).toBe(SubscriptionTier.BASIC);
        });
    });

    describe('Complex Multi-Entity Journeys', () => {
        it('should handle complete onboarding workflow', async () => {
            // Step 1: User registration
            const userResponse = await request(app.getHttpServer())
                .post('/users')
                .send(createMockUser({
                    email: 'onboarding@test.com',
                    firstName: 'Onboarding',
                    lastName: 'User',
                }))
                .expect(201);

            const userId = userResponse.body._id;

            // Step 2: Create organization
            const orgResponse = await request(app.getHttpServer())
                .post('/organizations')
                .send(createMockOrg({
                    name: 'Onboarding Organization',
                    ownerId: userId,
                }))
                .expect(201);

            const orgId = orgResponse.body._id;

            // Step 3: Create subscription
            const subscriptionResponse = await request(app.getHttpServer())
                .post('/subscriptions')
                .send({
                    userId: userId,
                    tier: SubscriptionTier.BASIC,
                    startDate: new Date().toISOString(),
                })
                .expect(201);

            const subscriptionId = subscriptionResponse.body._id;

            // Step 4: Add team member
            const memberResponse = await request(app.getHttpServer())
                .post('/users')
                .send(createMockUser({ email: 'teammember@test.com' }))
                .expect(201);

            const memberId = memberResponse.body._id;

            await request(app.getHttpServer())
                .post(`/organizations/${orgId}/users`)
                .send({
                    userId: memberId,
                    role: OrgRole.STAFF,
                })
                .expect(201);

            // Verify complete setup
            const finalOrgResponse = await request(app.getHttpServer())
                .get(`/organizations/${orgId}/users`)
                .expect(200);

            const finalSubResponse = await request(app.getHttpServer())
                .get(`/subscriptions/${subscriptionId}`)
                .expect(200);

            expect(finalOrgResponse.body).toHaveLength(2); // owner + member
            expect(finalSubResponse.body.tier).toBe(SubscriptionTier.BASIC);
        });

        it('should handle team management with subscription constraints', async () => {
            // Create owner
            const ownerResponse = await request(app.getHttpServer())
                .post('/users')
                .send(createMockUser({ email: 'teamowner@test.com' }))
                .expect(201);

            const ownerId = ownerResponse.body._id;

            // Create organization
            const orgResponse = await request(app.getHttpServer())
                .post('/organizations')
                .send(createMockOrg({
                    name: 'Team Management Org',
                    ownerId: ownerId,
                }))
                .expect(201);

            const orgId = orgResponse.body._id;

            // Create trial subscription (limited features)
            await request(app.getHttpServer())
                .post('/subscriptions')
                .send({
                    userId: ownerId,
                    tier: SubscriptionTier.TRIAL,
                    startDate: new Date().toISOString(),
                })
                .expect(201);

            // Add multiple team members
            const member1Response = await request(app.getHttpServer())
                .post('/users')
                .send(createMockUser({ email: 'member1@test.com' }))
                .expect(201);

            const member2Response = await request(app.getHttpServer())
                .post('/users')
                .send(createMockUser({ email: 'member2@test.com' }))
                .expect(201);

            // Add team members to organization
            await request(app.getHttpServer())
                .post(`/organizations/${orgId}/users`)
                .send({
                    userId: member1Response.body._id,
                    role: OrgRole.MANAGER,
                })
                .expect(201);

            await request(app.getHttpServer())
                .post(`/organizations/${orgId}/users`)
                .send({
                    userId: member2Response.body._id,
                    role: OrgRole.STAFF,
                })
                .expect(201);

            // Verify team structure
            const teamResponse = await request(app.getHttpServer())
                .get(`/organizations/${orgId}/users`)
                .expect(200);

            expect(teamResponse.body).toHaveLength(3); // owner + 2 members

            // Test role management
            await request(app.getHttpServer())
                .patch(`/organizations/${orgId}/users/${member2Response.body._id}`)
                .send({ role: OrgRole.MANAGER })
                .expect(200);
        });
    });

    describe('Error Handling E2E', () => {
        it('should handle 404 errors correctly', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();

            // Test user not found
            await request(app.getHttpServer())
                .get(`/users/${nonExistentId}`)
                .expect(404);

            // Test organization not found
            await request(app.getHttpServer())
                .get(`/organizations/${nonExistentId}`)
                .expect(404);

            // Test subscription not found
            await request(app.getHttpServer())
                .get(`/subscriptions/${nonExistentId}`)
                .expect(404);
        });

        it('should handle validation errors', async () => {
            // Invalid user data
            await request(app.getHttpServer())
                .post('/users')
                .send({ email: 'invalid' })
                .expect(400);

            // Invalid organization data
            await request(app.getHttpServer())
                .post('/organizations')
                .send({ name: '' })
                .expect(400);

            // Invalid subscription data
            await request(app.getHttpServer())
                .post('/subscriptions')
                .send({ tier: 'invalid-tier' })
                .expect(400);
        });

        it('should handle business logic errors', async () => {
            // Create user and subscription
            const userResponse = await request(app.getHttpServer())
                .post('/users')
                .send(createMockUser({ email: 'business@test.com' }))
                .expect(201);

            const userId = userResponse.body._id;

            await request(app.getHttpServer())
                .post('/subscriptions')
                .send({
                    userId: userId,
                    tier: SubscriptionTier.BASIC,
                    startDate: new Date().toISOString(),
                })
                .expect(201);

            // Try to create duplicate subscription
            await request(app.getHttpServer())
                .post('/subscriptions')
                .send({
                    userId: userId,
                    tier: SubscriptionTier.PREMIUM,
                    startDate: new Date().toISOString(),
                })
                .expect(409); // Conflict
        });
    });
});
