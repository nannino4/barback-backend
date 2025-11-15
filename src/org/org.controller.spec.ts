import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import * as request from 'supertest';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';
import { UserOrgRelationService } from './user-org-relation.service';
import { Org, OrgSchema } from './schemas/org.schema';
import { UserOrgRelation, UserOrgRelationSchema, OrgRole } from './schemas/user-org-relation.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { Subscription, SubscriptionSchema, SubscriptionStatus } from '../subscription/schemas/subscription.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRolesGuard } from './guards/org-roles.guard';
import { OrgSubscriptionGuard } from './guards/org-subscription.guard';
import { UserService } from '../user/user.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { StripeService } from '../common/services/stripe.service';
import { Types } from 'mongoose';
import { OutUserOrgRelationDto } from './dto/out.user-org-relation';
import { OutUserPublicDto } from '../user/dto/out.user.public.dto';
import { CustomLogger } from '../common/logger/custom.logger';
import { EmailVerifiedGuard } from 'src/auth/guards/email-verified.guard';

describe('OrgController (Integration)', () => 
{
    let app: INestApplication;
    let mongoServer: MongoMemoryReplSet;
    let userService: UserService;
    let testUser: User;
    let testUser2: User; // Second user to own Organization 2
    let testOrgs: Org[];
    let mockLogger: jest.Mocked<CustomLogger>;
    
    // Define models in root scope for accessibility across tests
    let userModel: any;
    let orgModel: any;
    let relationModel: any;
    let subscriptionModel: any;

    beforeAll(async () => 
    {
        mongoServer = await MongoMemoryReplSet.create({
            replSet: { count: 1, storageEngine: 'wiredTiger' },
        });
        const mongoUri = mongoServer.getUri();

        mockLogger = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
        } as any;

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                MongooseModule.forRoot(mongoUri),
                MongooseModule.forFeature([
                    { name: User.name, schema: UserSchema },
                    { name: Org.name, schema: OrgSchema },
                    { name: UserOrgRelation.name, schema: UserOrgRelationSchema },
                    { name: Subscription.name, schema: SubscriptionSchema },
                ]),
                JwtModule.register({
                    secret: 'test-secret',
                    signOptions: { expiresIn: '1h' },
                }),
            ],
            controllers: [OrgController],
            providers: [
                OrgService, 
                UserOrgRelationService, 
                UserService, 
                OrgRolesGuard,
                OrgSubscriptionGuard,
                SubscriptionService,
                StripeService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('test-stripe-key'),
                    },
                },
                {
                    provide: CustomLogger,
                    useValue: mockLogger,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: () => true, // Will be overridden in beforeEach
            })
            .overrideGuard(EmailVerifiedGuard)
            .useValue({
                canActivate: () => true,
            })
            .overrideGuard(OrgSubscriptionGuard)
            .useValue({
                canActivate: () => true, // Always allow for tests
            })

            .compile();

        app = moduleFixture.createNestApplication({
            logger: false, // Disable logging for tests
        });
        app.setGlobalPrefix('api');
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));

        userService = moduleFixture.get<UserService>(UserService);

        // Get model references
        userModel = moduleFixture.get('UserModel');
        orgModel = moduleFixture.get('OrgModel');
        relationModel = moduleFixture.get('UserOrgRelationModel');
        subscriptionModel = moduleFixture.get('SubscriptionModel');

        await app.init();
    });

    afterAll(async () => 
    {
        await app.close();
        await mongoServer.stop();
    });

    describe('GET /orgs', () => 
    {
        beforeEach(async () => 
        {
            // Create test users
            testUser = await userService.create({
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                hashedPassword: 'hashedPassword123',
                phoneNumber: '+1234567890',
            });

            testUser2 = await userService.create({
                email: 'test2@example.com',
                firstName: 'Jane',
                lastName: 'Smith', 
                hashedPassword: 'hashedPassword456',
                phoneNumber: '+0987654321',
            });

            // Create test organizations with proper ownership
            const subscriptionId1 = new Types.ObjectId();
            const subscriptionId2 = new Types.ObjectId();
            const subscriptionId3 = new Types.ObjectId();

            testOrgs = await orgModel.insertMany([
                {
                    name: 'Organization 1',
                    ownerId: testUser._id,
                    subscriptionId: subscriptionId1,
                    settings: { defaultCurrency: 'USD' },
                },
                {
                    name: 'Organization 2', 
                    ownerId: testUser2._id, // Different owner
                    subscriptionId: subscriptionId2,
                    settings: { defaultCurrency: 'EUR' },
                },
                {
                    name: 'Organization 3',
                    ownerId: new Types.ObjectId(), // Third different owner
                    subscriptionId: subscriptionId3,
                    settings: { defaultCurrency: 'GBP' },
                },
            ]);

            // Create test user-org relations with proper ownership structure
            await relationModel.insertMany([
                {
                    userId: testUser._id,
                    orgId: testOrgs[0]._id,
                    orgRole: OrgRole.OWNER, // testUser owns Organization 1
                },
                {
                    userId: testUser2._id,
                    orgId: testOrgs[1]._id,
                    orgRole: OrgRole.OWNER, // testUser2 owns Organization 2
                },
                {
                    userId: testUser._id,
                    orgId: testOrgs[1]._id,
                    orgRole: OrgRole.MANAGER, // testUser is manager in Organization 2
                },
                {
                    userId: testUser._id,
                    orgId: testOrgs[2]._id,
                    orgRole: OrgRole.STAFF, // testUser is staff in Organization 3
                },
            ]);

            // Override guard to use the created test user
            const moduleRef = app.get(JwtAuthGuard);
            jest.spyOn(moduleRef, 'canActivate').mockImplementation(async (context) => 
            {
                const request = context.switchToHttp().getRequest();
                // Get fresh user data from database to ensure updates are reflected
                const freshUser = await userService.findById(testUser._id as Types.ObjectId);
                request.user = freshUser;
                return true;
            });
        });

        afterEach(async () => 
        {
            // Clean up database after each test using model references
            await Promise.all([
                userModel.deleteMany({}).exec(),
                orgModel.deleteMany({}).exec(),
                relationModel.deleteMany({}).exec(),
            ]);
        });

        it('should return all user organizations without role filter', async () => 
        {
            const response = await request(app.getHttpServer())
                .get('/api/orgs')
                .expect(200);

            expect(response.body).toHaveLength(3);
            
            // Verify each organization relation has basic structure
            response.body.forEach((orgRelation: OutUserOrgRelationDto) => 
            {
                expect(orgRelation).toHaveProperty('role');
                expect(Object.values(OrgRole)).toContain(orgRelation.role);
            });

            // Verify all roles are included
            const roles = response.body.map((rel: OutUserOrgRelationDto) => rel.role);
            expect(roles).toContain(OrgRole.OWNER);
            expect(roles).toContain(OrgRole.MANAGER);
            expect(roles).toContain(OrgRole.STAFF);
        });

        it('should filter organizations by OWNER role', async () => 
        {
            const response = await request(app.getHttpServer())
                .get('/api/orgs?orgRole=OWNER')
                .expect(200);

            expect(response.body).toHaveLength(1);
            expect(response.body[0].role).toBe(OrgRole.OWNER);
            expect(response.body[0].org.name).toBe('Organization 1');
        });

        it('should filter organizations by MANAGER role', async () => 
        {
            const response = await request(app.getHttpServer())
                .get('/api/orgs?orgRole=MANAGER')
                .expect(200);

            expect(response.body).toHaveLength(1);
            expect(response.body[0].role).toBe(OrgRole.MANAGER);
            expect(response.body[0].org.name).toBe('Organization 2');
        });

        it('should filter organizations by STAFF role', async () => 
        {
            const response = await request(app.getHttpServer())
                .get('/api/orgs?orgRole=STAFF')
                .expect(200);

            expect(response.body).toHaveLength(1);
            expect(response.body[0].role).toBe(OrgRole.STAFF);
            expect(response.body[0].org.name).toBe('Organization 3');
        });

        it('should return empty array when no organizations match the role filter', async () => 
        {
            // Delete all relations first
            const relationModel = app.get('UserOrgRelationModel');
            await relationModel.deleteMany({}).exec();

            const response = await request(app.getHttpServer())
                .get('/api/orgs?orgRole=owner')
                .expect(200);

            expect(response.body).toHaveLength(0);
        });

        it('should handle invalid role filter gracefully', async () => 
        {
            const response = await request(app.getHttpServer())
                .get('/api/orgs?orgRole=invalid_role')
                .expect(200);

            // Should return empty array for invalid role
            expect(response.body).toHaveLength(0);
        });

        it('should require authentication', async () => 
        {
            // Override guard to reject authentication
            const moduleRef = app.get(JwtAuthGuard);
            jest.spyOn(moduleRef, 'canActivate').mockImplementation(async () => false);

            await request(app.getHttpServer())
                .get('/api/orgs')
                .expect(403);
        });

        it('should handle case when organization is deleted but relation exists', async () => 
        {
            // Delete one organization but keep the relation
            const orgModel = app.get('OrgModel');
            await orgModel.findByIdAndDelete(testOrgs[0]._id).exec();

            const response = await request(app.getHttpServer())
                .get('/api/orgs')
                .expect(409); // ConflictException

            expect(response.body.message).toContain('Corrupted relationship');
            expect(response.body.message).toContain('organization not found');
        });

        it('should return organizations in correct DTO format', async () => 
        {
            const response = await request(app.getHttpServer())
                .get('/api/orgs')
                .expect(200);

            expect(response.body).toHaveLength(3);

            response.body.forEach((orgRelation: OutUserOrgRelationDto) => 
            {
                // Verify DTO structure matches OutUserOrgRelationDto exactly
                const expectedUser: OutUserPublicDto = {
                    id: expect.any(String),
                    email: expect.any(String),
                    firstName: expect.any(String),
                    lastName: expect.any(String),
                };

                // Add profilePictureUrl only if it exists in the response
                if (orgRelation.user.hasOwnProperty('profilePictureUrl')) 
                {
                    expectedUser.profilePictureUrl = expect.any(String);
                }

                expect(orgRelation).toEqual({
                    user: expectedUser,
                    org: {
                        id: expect.any(String),
                        name: expect.any(String),
                        owner: expect.any(Object),
                    },
                    role: expect.any(String),
                });

                // Verify role is a valid OrgRole
                expect(Object.values(OrgRole)).toContain(orgRelation.role);

                // Verify org ID is a valid ObjectId string
                expect(orgRelation.org.id).toMatch(/^[0-9a-fA-F]{24}$/);
                
                // Verify user ID is a valid ObjectId string
                expect(orgRelation.user.id).toMatch(/^[0-9a-fA-F]{24}$/);
            });
        });

        it('should only expose fields defined in DTOs and exclude sensitive data', async () => 
        {
            const response = await request(app.getHttpServer())
                .get('/api/orgs')
                .expect(200);

            expect(response.body).toHaveLength(3);

            response.body.forEach((orgRelation: OutUserOrgRelationDto) => 
            {
                // Test that ONLY the exposed fields are present in the response
                const expectedTopLevelKeys = ['user', 'org', 'role'];
                expect(Object.keys(orgRelation)).toEqual(expect.arrayContaining(expectedTopLevelKeys));
                expect(Object.keys(orgRelation)).toHaveLength(expectedTopLevelKeys.length);

                // Test user object only contains exposed fields
                const expectedUserKeys = ['id', 'email', 'firstName', 'lastName'];
                const actualUserKeys = Object.keys(orgRelation.user);
                
                // profilePictureUrl is optional, so only include it if present
                if (orgRelation.user.hasOwnProperty('profilePictureUrl')) 
                {
                    expectedUserKeys.push('profilePictureUrl');
                }
                
                expect(actualUserKeys).toEqual(expect.arrayContaining(expectedUserKeys));
                expect(actualUserKeys).toHaveLength(expectedUserKeys.length);

                // Test org object only contains exposed fields (including owner)
                const expectedOrgKeys = ['id', 'name', 'owner'];
                expect(Object.keys(orgRelation.org)).toEqual(expect.arrayContaining(expectedOrgKeys));
                expect(Object.keys(orgRelation.org)).toHaveLength(expectedOrgKeys.length);

                // Verify sensitive/internal fields are NOT exposed
                // User sensitive fields
                expect(orgRelation.user).not.toHaveProperty('hashedPassword');
                expect(orgRelation.user).not.toHaveProperty('phoneNumber');
                expect(orgRelation.user).not.toHaveProperty('role');
                expect(orgRelation.user).not.toHaveProperty('authProvider');
                expect(orgRelation.user).not.toHaveProperty('isActive');
                expect(orgRelation.user).not.toHaveProperty('isEmailVerified');
                expect(orgRelation.user).not.toHaveProperty('emailVerificationToken');
                expect(orgRelation.user).not.toHaveProperty('passwordResetToken');
                expect(orgRelation.user).not.toHaveProperty('createdAt');
                expect(orgRelation.user).not.toHaveProperty('updatedAt');
                expect(orgRelation.user).not.toHaveProperty('_id');
                expect(orgRelation.user).not.toHaveProperty('__v');

                // Org sensitive fields
                expect(orgRelation.org).not.toHaveProperty('ownerId');
                expect(orgRelation.org).not.toHaveProperty('subscriptionId');
                expect(orgRelation.org).not.toHaveProperty('settings');
                expect(orgRelation.org).not.toHaveProperty('createdAt');
                expect(orgRelation.org).not.toHaveProperty('updatedAt');
                expect(orgRelation.org).not.toHaveProperty('_id');
                expect(orgRelation.org).not.toHaveProperty('__v');

                // Mongoose internal fields should not be exposed
                expect(orgRelation).not.toHaveProperty('$__');
                expect(orgRelation).not.toHaveProperty('$isNew');
                expect(orgRelation).not.toHaveProperty('_doc');
                expect(orgRelation.user).not.toHaveProperty('$__');
                expect(orgRelation.user).not.toHaveProperty('$isNew');
                expect(orgRelation.user).not.toHaveProperty('_doc');
                expect(orgRelation.org).not.toHaveProperty('$__');
                expect(orgRelation.org).not.toHaveProperty('$isNew');
                expect(orgRelation.org).not.toHaveProperty('_doc');
            });
        });

        it('should return user data correctly in DTO format', async () => 
        {
            const response = await request(app.getHttpServer())
                .get('/api/orgs')
                .expect(200);

            expect(response.body).toHaveLength(3);

            // Verify user data matches expected values
            response.body.forEach((orgRelation: OutUserOrgRelationDto) => 
            {
                expect(orgRelation.user.email).toBe(testUser.email);
                expect(orgRelation.user.firstName).toBe(testUser.firstName);
                expect(orgRelation.user.lastName).toBe(testUser.lastName);
                expect(orgRelation.user.id).toBe(testUser.id);
                // profilePictureUrl is optional - only check if it's present in the response
                if (orgRelation.user.hasOwnProperty('profilePictureUrl')) 
                {
                    expect(orgRelation.user.profilePictureUrl).toBeDefined();
                }
            });
        });

        it('should return correct organization data for different users', async () => 
        {
            // Create another user with different organizations
            const anotherUser = await userService.create({
                email: 'another@example.com',
                firstName: 'Jane',
                lastName: 'Smith',
                hashedPassword: 'hashedPassword456',
                phoneNumber: '+9876543210',
            });

            // Create relation for the other user to only one org
            const relationModel = app.get('UserOrgRelationModel');
            await relationModel.create({
                userId: anotherUser._id,
                orgId: testOrgs[0]._id,
                orgRole: OrgRole.STAFF,
            });

            // Update auth guard to use the other user
            const moduleRef = app.get(JwtAuthGuard);
            jest.spyOn(moduleRef, 'canActivate').mockImplementation(async (context) => 
            {
                const request = context.switchToHttp().getRequest();
                request.user = anotherUser;
                return true;
            });

            const response = await request(app.getHttpServer())
                .get('/api/orgs')
                .expect(200);

            // Should only return the one organization the other user has access to
            expect(response.body).toHaveLength(1);
            expect(response.body[0].role).toBe(OrgRole.STAFF);
            expect(response.body[0].org.name).toBe('Organization 1');
            
            // Verify the user data is correctly populated for the different user
            expect(response.body[0].user.email).toBe(anotherUser.email);
            expect(response.body[0].user.firstName).toBe(anotherUser.firstName);
            expect(response.body[0].user.lastName).toBe(anotherUser.lastName);
            expect(response.body[0].user.id).toBe(anotherUser.id);
        });
    });

    describe('GET /orgs/:id/members', () => 
    {
        beforeEach(async () => 
        {
            // Create test users
            testUser = await userService.create({
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                hashedPassword: 'hashedPassword123',
                phoneNumber: '+1234567890',
            });

            testUser2 = await userService.create({
                email: 'test2@example.com',
                firstName: 'Jane',
                lastName: 'Smith', 
                hashedPassword: 'hashedPassword456',
                phoneNumber: '+0987654321',
            });

            // Create test organizations with proper ownership
            const subscriptionId1 = new Types.ObjectId();
            const subscriptionId2 = new Types.ObjectId();
            const subscriptionId3 = new Types.ObjectId();

            testOrgs = await orgModel.insertMany([
                {
                    name: 'Organization 1',
                    ownerId: testUser._id,
                    subscriptionId: subscriptionId1,
                    settings: { defaultCurrency: 'USD' },
                },
                {
                    name: 'Organization 2', 
                    ownerId: testUser2._id, // Different owner
                    subscriptionId: subscriptionId2,
                    settings: { defaultCurrency: 'EUR' },
                },
                {
                    name: 'Organization 3',
                    ownerId: new Types.ObjectId(), // Third different owner
                    subscriptionId: subscriptionId3,
                    settings: { defaultCurrency: 'GBP' },
                },
            ]);

            // Create test user-org relations with proper ownership structure
            await relationModel.insertMany([
                {
                    userId: testUser._id,
                    orgId: testOrgs[0]._id,
                    orgRole: OrgRole.OWNER, // testUser owns Organization 1
                },
                {
                    userId: testUser2._id,
                    orgId: testOrgs[1]._id,
                    orgRole: OrgRole.OWNER, // testUser2 owns Organization 2
                },
                {
                    userId: testUser._id,
                    orgId: testOrgs[1]._id,
                    orgRole: OrgRole.MANAGER, // testUser is manager in Organization 2
                },
                {
                    userId: testUser._id,
                    orgId: testOrgs[2]._id,
                    orgRole: OrgRole.STAFF, // testUser is staff in Organization 3
                },
            ]);

            // Override guard to use the created test user
            const moduleRef = app.get(JwtAuthGuard);
            jest.spyOn(moduleRef, 'canActivate').mockImplementation(async (context) => 
            {
                const request = context.switchToHttp().getRequest();
                // Get fresh user data from database to ensure updates are reflected
                const freshUser = await userService.findById(testUser._id as Types.ObjectId);
                request.user = freshUser;
                return true;
            });
        });

        afterEach(async () => 
        {
            // Clean up database after each test using model references
            await Promise.all([
                userModel.deleteMany({}).exec(),
                orgModel.deleteMany({}).exec(),
                relationModel.deleteMany({}).exec(),
            ]);
        });

        it('should return all members of an organization', async () => 
        {
            // Add another user to Organization 1 to test multiple members
            const anotherUser = await userService.create({
                email: 'member@example.com',
                firstName: 'Member',
                lastName: 'User',
                hashedPassword: 'hashedPassword789',
                phoneNumber: '+1111111111',
            });

            await relationModel.create({
                userId: anotherUser._id,
                orgId: testOrgs[0]._id,
                orgRole: OrgRole.STAFF,
            });

            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${testOrgs[0].id}/members`)
                .expect(200);

            expect(response.body).toHaveLength(2); // testUser (OWNER) + anotherUser (STAFF)
            
            // Verify response structure
            response.body.forEach((member: OutUserOrgRelationDto) => 
            {
                expect(member).toHaveProperty('user');
                expect(member).toHaveProperty('org');
                expect(member).toHaveProperty('role');
                expect(member.org.id).toBe(testOrgs[0].id);
                expect(member.org.name).toBe('Organization 1');
                expect(Object.values(OrgRole)).toContain(member.role);
            });

            // Verify both users are included
            const userEmails = response.body.map((m: OutUserOrgRelationDto) => m.user.email);
            expect(userEmails).toContain(testUser.email);
            expect(userEmails).toContain(anotherUser.email);
        });

        it('should return members with different roles in the same organization', async () => 
        {
            // Use Organization 2 which already has testUser2 (OWNER) + testUser (MANAGER)
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${testOrgs[1].id}/members`)
                .expect(200);

            expect(response.body).toHaveLength(2);
            
            // Verify different roles are returned correctly
            const roles = response.body.map((m: OutUserOrgRelationDto) => m.role);
            expect(roles).toContain(OrgRole.OWNER);
            expect(roles).toContain(OrgRole.MANAGER);
        });

        it('should return single member when organization has only one member', async () => 
        {
            // Use Organization 3 which only has testUser as STAFF
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${testOrgs[2].id}/members`)
                .expect(200);

            expect(response.body).toHaveLength(1);
            expect(response.body[0].user.email).toBe(testUser.email);
            expect(response.body[0].role).toBe(OrgRole.STAFF);
            expect(response.body[0].org.name).toBe('Organization 3');
        });

        it('should return 403 when user has no access to organization', async () => 
        {
            const nonExistentOrgId = new Types.ObjectId();
            
            await request(app.getHttpServer())
                .get(`/api/orgs/${nonExistentOrgId}/members`)
                .expect(403); // ForbiddenException thrown by guard when user has no relationship with org
        });

        it('should exclude sensitive user data in response', async () => 
        {
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${testOrgs[0].id}/members`)
                .expect(200);

            response.body.forEach((member: OutUserOrgRelationDto) => 
            {
                // Verify sensitive fields are not exposed
                expect(member.user).not.toHaveProperty('hashedPassword');
                expect(member.user).not.toHaveProperty('phoneNumber');
                expect(member.user).not.toHaveProperty('role');
                expect(member.user).not.toHaveProperty('authProvider');
                expect(member.user).not.toHaveProperty('isActive');
                expect(member.user).not.toHaveProperty('isEmailVerified');
                
                // Verify org sensitive fields are not exposed
                expect(member.org).not.toHaveProperty('ownerId');
                expect(member.org).not.toHaveProperty('subscriptionId');
                expect(member.org).not.toHaveProperty('settings');
            });
        });

        it('should require authentication', async () => 
        {
            // Override guard to reject authentication
            const moduleRef = app.get(JwtAuthGuard);
            jest.spyOn(moduleRef, 'canActivate').mockImplementation(async () => false);

            await request(app.getHttpServer())
                .get(`/api/orgs/${testOrgs[0].id}/members`)
                .expect(403);
        });
    });

    describe('PUT /orgs/:id (updateOrg)', () => 
    {
        beforeEach(async () => 
        {
            // Create test users
            testUser = await userService.create({
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                hashedPassword: 'hashedPassword123',
                phoneNumber: '+1234567890',
            });

            testUser2 = await userService.create({
                email: 'test2@example.com',
                firstName: 'Jane',
                lastName: 'Smith', 
                hashedPassword: 'hashedPassword456',
                phoneNumber: '+0987654321',
            });

            // Create test organizations with proper ownership
            const subscriptionId1 = new Types.ObjectId();
            const subscriptionId2 = new Types.ObjectId();

            testOrgs = await orgModel.insertMany([
                {
                    name: 'Test Organization 1',
                    ownerId: testUser._id,
                    subscriptionId: subscriptionId1,
                    settings: { defaultCurrency: 'USD' },
                },
                {
                    name: 'Test Organization 2', 
                    ownerId: testUser2._id, // Different owner
                    subscriptionId: subscriptionId2,
                    settings: { defaultCurrency: 'EUR' },
                },
            ]);

            // Create test user-org relations with proper ownership structure
            await relationModel.insertMany([
                {
                    userId: testUser._id,
                    orgId: testOrgs[0]._id,
                    orgRole: OrgRole.OWNER, // testUser owns Organization 1
                },
                {
                    userId: testUser2._id,
                    orgId: testOrgs[1]._id,
                    orgRole: OrgRole.OWNER, // testUser2 owns Organization 2
                },
            ]);

            // Override guards for test setup
            const moduleRef = app.get(JwtAuthGuard);
            jest.spyOn(moduleRef, 'canActivate').mockImplementation(async (context) => 
            {
                const request = context.switchToHttp().getRequest();
                // Get fresh user data from database to ensure updates are reflected
                const freshUser = await userService.findById(testUser._id as Types.ObjectId);
                request.user = freshUser;
                return true;
            });
        });

        afterEach(async () => 
        {
            // Clean up database after each test using model references
            await Promise.all([
                userModel.deleteMany({}).exec(),
                orgModel.deleteMany({}).exec(),
                relationModel.deleteMany({}).exec(),
            ]);
        });

        it('should update organization name successfully', async () => 
        {
            // Arrange
            const updateData = { name: 'Updated Organization Name' };

            // Act & Assert
            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}`)
                .send(updateData)
                .expect(200);

            // Assert response structure
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('name', 'Updated Organization Name');
            expect(response.body).toHaveProperty('settings');
            expect(response.body.settings).toHaveProperty('defaultCurrency');

            // Assert database state
            const orgInDb = await orgModel.findById(testOrgs[0].id);
            expect(orgInDb!.name).toBe('Updated Organization Name');
        });

        it('should update organization settings successfully', async () => 
        {
            // Arrange
            const updateData = { 
                settings: { 
                    defaultCurrency: 'GBP', 
                }, 
            };

            // Act & Assert
            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}`)
                .send(updateData)
                .expect(200);

            // Assert response structure
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('name', 'Test Organization 1');
            expect(response.body).toHaveProperty('settings');
            expect(response.body.settings.defaultCurrency).toBe('GBP');

            // Assert database state
            const orgInDb = await orgModel.findById(testOrgs[0].id);
            expect(orgInDb!.settings.defaultCurrency).toBe('GBP');
        });

        it('should update both name and settings successfully', async () => 
        {
            // Arrange
            const updateData = { 
                name: 'Completely New Name',
                settings: { 
                    defaultCurrency: 'JPY', 
                }, 
            };

            // Act & Assert
            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}`)
                .send(updateData)
                .expect(200);

            // Assert response structure
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('name', 'Completely New Name');
            expect(response.body).toHaveProperty('settings');
            expect(response.body.settings.defaultCurrency).toBe('JPY');

            // Assert database state
            const orgInDb = await orgModel.findById(testOrgs[0].id);
            expect(orgInDb!.name).toBe('Completely New Name');
            expect(orgInDb!.settings.defaultCurrency).toBe('JPY');
        });

        it('should return 400 with invalid request data (empty name)', async () => 
        {
            // Arrange
            const invalidData = { name: '' }; // Empty name should fail validation

            // Act & Assert
            await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}`)
                .send(invalidData)
                .expect(400);
        });

        it('should return 400 with invalid settings data', async () => 
        {
            // Arrange
            const invalidData = { 
                settings: { 
                    defaultCurrency: 'INVALID', // Invalid currency code (too long)
                }, 
            };

            // Act & Assert
            await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}`)
                .send(invalidData)
                .expect(400);
        });

        it('should require organization owner role', async () => 
        {
            // Arrange - Switch to testUser2 who doesn't own org 1
            const moduleRef = app.get(JwtAuthGuard);
            jest.spyOn(moduleRef, 'canActivate').mockImplementation(async (context) => 
            {
                const request = context.switchToHttp().getRequest();
                const freshUser = await userService.findById(testUser2._id as Types.ObjectId);
                request.user = freshUser;
                return true;
            });

            const updateData = { name: 'Updated Name' };

            // Act & Assert
            await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}`)
                .send(updateData)
                .expect(403);
        });

        it('should require authentication', async () => 
        {
            // Arrange
            const moduleRef = app.get(JwtAuthGuard);
            jest.spyOn(moduleRef, 'canActivate').mockImplementation(async () => false);

            const updateData = { name: 'Updated Name' };

            // Act & Assert
            await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}`)
                .send(updateData)
                .expect(403);
        });

        it('should return 400 for invalid ObjectId format', async () => 
        {
            // Arrange
            const invalidId = 'invalid-id';
            const updateData = { name: 'Updated Name' };

            // Act & Assert - Guard validation catches invalid ObjectId and throws BadRequestException
            await request(app.getHttpServer())
                .put(`/api/orgs/${invalidId}`)
                .send(updateData)
                .expect(400);
        });

        it('should preserve other organization fields when updating', async () => 
        {
            // Arrange
            const updateData = { name: 'Just Name Change' };
            const originalOrg = await orgModel.findById(testOrgs[0].id);

            // Act
            await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}`)
                .send(updateData)
                .expect(200);

            // Assert database state - other fields unchanged
            const updatedOrg = await orgModel.findById(testOrgs[0].id);
            expect(updatedOrg!.ownerId.toString()).toBe(originalOrg!.ownerId.toString());
            expect(updatedOrg!.subscriptionId.toString()).toBe(originalOrg!.subscriptionId.toString());
            expect(updatedOrg!.name).toBe('Just Name Change');
        });
    });

    describe('PUT /orgs/:id/members/:userId/role (updateMemberRole)', () => 
    {
        let testUser3: User; // Additional user for testing role updates

        beforeEach(async () => 
        {
            // Create test users
            testUser = await userService.create({
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                hashedPassword: 'hashedPassword123',
                phoneNumber: '+1234567890',
            });

            testUser2 = await userService.create({
                email: 'test2@example.com',
                firstName: 'Jane',
                lastName: 'Smith', 
                hashedPassword: 'hashedPassword456',
                phoneNumber: '+0987654321',
            });

            testUser3 = await userService.create({
                email: 'test3@example.com',
                firstName: 'Bob',
                lastName: 'Wilson', 
                hashedPassword: 'hashedPassword789',
                phoneNumber: '+0123456789',
            });

            // Create test organizations with proper ownership
            const subscriptionId1 = new Types.ObjectId();
            const subscriptionId2 = new Types.ObjectId();

            testOrgs = await orgModel.insertMany([
                {
                    name: 'Test Organization 1',
                    ownerId: testUser._id,
                    subscriptionId: subscriptionId1,
                    settings: { defaultCurrency: 'USD' },
                },
                {
                    name: 'Test Organization 2', 
                    ownerId: testUser2._id, // Different owner
                    subscriptionId: subscriptionId2,
                    settings: { defaultCurrency: 'EUR' },
                },
            ]);

            // Create test user-org relations with proper ownership structure
            await relationModel.insertMany([
                {
                    userId: testUser._id,
                    orgId: testOrgs[0]._id,
                    orgRole: OrgRole.OWNER, // testUser owns Organization 1
                },
                {
                    userId: testUser2._id,
                    orgId: testOrgs[1]._id,
                    orgRole: OrgRole.OWNER, // testUser2 owns Organization 2
                },
                {
                    userId: testUser2._id,
                    orgId: testOrgs[0]._id,
                    orgRole: OrgRole.MANAGER, // testUser2 is manager in Organization 1
                },
                {
                    userId: testUser3._id,
                    orgId: testOrgs[0]._id,
                    orgRole: OrgRole.STAFF, // testUser3 is staff in Organization 1
                },
            ]);

            // Override guards for test setup - authenticate as testUser (owner of org 1)
            const moduleRef = app.get(JwtAuthGuard);
            jest.spyOn(moduleRef, 'canActivate').mockImplementation(async (context) => 
            {
                const request = context.switchToHttp().getRequest();
                const freshUser = await userService.findById(testUser._id as Types.ObjectId);
                request.user = freshUser;
                return true;
            });
        });

        afterEach(async () => 
        {
            // Clean up database after each test using model references
            await Promise.all([
                userModel.deleteMany({}).exec(),
                orgModel.deleteMany({}).exec(),
                relationModel.deleteMany({}).exec(),
            ]);
        });

        it('should update member role from STAFF to MANAGER successfully', async () => 
        {
            // Arrange
            const updateData = { role: OrgRole.MANAGER };

            // Act & Assert
            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}/members/${testUser3.id}/role`)
                .send(updateData)
                .expect(200);

            // Assert response structure
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('org');
            expect(response.body).toHaveProperty('role', OrgRole.MANAGER);
            
            expect(response.body.user.id).toBe(testUser3.id);
            expect(response.body.user.email).toBe(testUser3.email);
            expect(response.body.org.id).toBe(testOrgs[0].id);
            expect(response.body.org.name).toBe('Test Organization 1');

            // Assert database state
            const updatedRelation = await relationModel.findOne({
                userId: testUser3._id,
                orgId: testOrgs[0]._id,
            });
            expect(updatedRelation!.orgRole).toBe(OrgRole.MANAGER);
        });

        it('should update member role from MANAGER to STAFF successfully', async () => 
        {
            // Arrange
            const updateData = { role: OrgRole.STAFF };

            // Act & Assert
            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}/members/${testUser2.id}/role`)
                .send(updateData)
                .expect(200);

            // Assert response structure
            expect(response.body.role).toBe(OrgRole.STAFF);
            expect(response.body.user.id).toBe(testUser2.id);

            // Assert database state
            const updatedRelation = await relationModel.findOne({
                userId: testUser2._id,
                orgId: testOrgs[0]._id,
            });
            expect(updatedRelation!.orgRole).toBe(OrgRole.STAFF);
        });

        it('should allow MANAGER to update member roles', async () => 
        {
            // Arrange - Switch to testUser2 who is manager in Organization 1
            const moduleRef = app.get(JwtAuthGuard);
            jest.spyOn(moduleRef, 'canActivate').mockImplementation(async (context) => 
            {
                const request = context.switchToHttp().getRequest();
                const freshUser = await userService.findById(testUser2._id as Types.ObjectId);
                request.user = freshUser;
                return true;
            });

            const updateData = { role: OrgRole.MANAGER };

            // Act & Assert
            await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}/members/${testUser3.id}/role`)
                .send(updateData)
                .expect(200);

            // Assert database state
            const updatedRelation = await relationModel.findOne({
                userId: testUser3._id,
                orgId: testOrgs[0]._id,
            });
            expect(updatedRelation!.orgRole).toBe(OrgRole.MANAGER);
        });

        it('should prevent assignment of OWNER role', async () => 
        {
            // Arrange
            const updateData = { role: OrgRole.OWNER };

            // Act & Assert
            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}/members/${testUser3.id}/role`)
                .send(updateData)
                .expect(400);

            expect(response.body.message).toBe('Cannot assign OWNER role through role updates');
            expect(response.body.error).toBe('OWNER_ROLE_ASSIGNMENT_NOT_ALLOWED');

            // Assert database state unchanged
            const unchangedRelation = await relationModel.findOne({
                userId: testUser3._id,
                orgId: testOrgs[0]._id,
            });
            expect(unchangedRelation!.orgRole).toBe(OrgRole.STAFF); // Should remain unchanged
        });

        it('should prevent modification of OWNER role', async () => 
        {
            // Arrange - Try to modify the owner's role
            const updateData = { role: OrgRole.MANAGER };

            // Act & Assert
            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}/members/${testUser.id}/role`)
                .send(updateData)
                .expect(400);

            expect(response.body.message).toBe('Cannot modify the role of an organization owner');
            expect(response.body.error).toBe('OWNER_ROLE_MODIFICATION_NOT_ALLOWED');

            // Assert database state unchanged
            const unchangedRelation = await relationModel.findOne({
                userId: testUser._id,
                orgId: testOrgs[0]._id,
            });
            expect(unchangedRelation!.orgRole).toBe(OrgRole.OWNER); // Should remain unchanged
        });

        it('should return 404 when target user is not a member of the organization', async () => 
        {
            // Arrange - Create a user not in the organization
            const nonMemberUser = await userService.create({
                email: 'nonmember@example.com',
                firstName: 'Non',
                lastName: 'Member',
                hashedPassword: 'hashedPassword123',
                phoneNumber: '+9999999999',
            });

            const updateData = { role: OrgRole.MANAGER };

            // Act & Assert
            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}/members/${nonMemberUser.id}/role`)
                .send(updateData)
                .expect(404);

            expect(response.body.message).toContain('User is not a member of this organization');
        });

        it('should return 403 when user is STAFF trying to update roles', async () => 
        {
            // Arrange - Switch to testUser3 who is staff in Organization 1
            const moduleRef = app.get(JwtAuthGuard);
            jest.spyOn(moduleRef, 'canActivate').mockImplementation(async (context) => 
            {
                const request = context.switchToHttp().getRequest();
                const freshUser = await userService.findById(testUser3._id as Types.ObjectId);
                request.user = freshUser;
                return true;
            });

            const updateData = { role: OrgRole.MANAGER };

            // Act & Assert
            await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}/members/${testUser2.id}/role`)
                .send(updateData)
                .expect(403); // ForbiddenException from OrgRolesGuard
        });

        it('should return 403 when user has no access to organization', async () => 
        {
            // Arrange - Use non-existent organization
            const nonExistentOrgId = new Types.ObjectId();
            const updateData = { role: OrgRole.MANAGER };
            
            // Act & Assert
            await request(app.getHttpServer())
                .put(`/api/orgs/${nonExistentOrgId}/members/${testUser3.id}/role`)
                .send(updateData)
                .expect(403); // ForbiddenException from OrgRolesGuard
        });

        it('should validate role enum values', async () => 
        {
            // Arrange
            const invalidData = { role: 'invalid_role' };

            // Act & Assert
            await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}/members/${testUser3.id}/role`)
                .send(invalidData)
                .expect(400); // ValidationPipe should reject invalid enum
        });

        it('should require authentication', async () => 
        {
            // Arrange
            const moduleRef = app.get(JwtAuthGuard);
            jest.spyOn(moduleRef, 'canActivate').mockImplementation(async () => false);

            const updateData = { role: OrgRole.MANAGER };

            // Act & Assert
            await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}/members/${testUser3.id}/role`)
                .send(updateData)
                .expect(403);
        });

        it('should return 400 for invalid ObjectId format', async () => 
        {
            // Arrange
            const invalidId = 'invalid-id';
            const updateData = { role: OrgRole.MANAGER };

            // Act & Assert - ObjectIdValidationPipe should catch invalid ObjectId
            await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}/members/${invalidId}/role`)
                .send(updateData)
                .expect(400);
        });

        it('should exclude sensitive user data in response', async () => 
        {
            // Arrange
            const updateData = { role: OrgRole.MANAGER };

            // Act
            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${testOrgs[0].id}/members/${testUser3.id}/role`)
                .send(updateData)
                .expect(200);

            // Assert - Verify sensitive fields are not exposed
            expect(response.body.user).not.toHaveProperty('hashedPassword');
            expect(response.body.user).not.toHaveProperty('phoneNumber');
            expect(response.body.user).not.toHaveProperty('role'); // User system role, not org role
            expect(response.body.user).not.toHaveProperty('authProvider');
            expect(response.body.user).not.toHaveProperty('isActive');
            expect(response.body.user).not.toHaveProperty('isEmailVerified');
            
            // Verify org sensitive fields are not exposed
            expect(response.body.org).not.toHaveProperty('ownerId');
            expect(response.body.org).not.toHaveProperty('subscriptionId');
            expect(response.body.org).not.toHaveProperty('settings');
        });

        it('should handle concurrent role updates gracefully', async () => 
        {
            // Arrange
            const updateData = { role: OrgRole.MANAGER };

            // Act - Simulate concurrent requests
            const promises = Array(3).fill(null).map(() =>
                request(app.getHttpServer())
                    .put(`/api/orgs/${testOrgs[0].id}/members/${testUser3.id}/role`)
                    .send(updateData)
            );

            const results = await Promise.allSettled(promises);
            
            // Assert - At least one should succeed, others might fail due to race conditions
            const successfulRequests = results.filter(result => 
                result.status === 'fulfilled' && result.value.status === 200
            );
            
            expect(successfulRequests.length).toBeGreaterThanOrEqual(1);

            // Verify final database state
            const finalRelation = await relationModel.findOne({
                userId: testUser3._id,
                orgId: testOrgs[0]._id,
            });
            expect(finalRelation!.orgRole).toBe(OrgRole.MANAGER);
        });
    });

    describe('POST /orgs/validate-name', () => 
    {
        beforeEach(async () => 
        {
            // Create test user
            testUser = await userService.create({
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                hashedPassword: 'hashedPassword123',
                phoneNumber: '+1234567890',
            });

            // Override guard to use the created test user
            const moduleRef = app.get(JwtAuthGuard);
            jest.spyOn(moduleRef, 'canActivate').mockImplementation(async (context) => 
            {
                const request = context.switchToHttp().getRequest();
                const freshUser = await userService.findById(testUser._id as Types.ObjectId);
                request.user = freshUser;
                return true;
            });
        });

        afterEach(async () => 
        {
            // Clean up database after each test
            await Promise.all([
                userModel.deleteMany({}).exec(),
                orgModel.deleteMany({}).exec(),
                relationModel.deleteMany({}).exec(),
                subscriptionModel.deleteMany({}).exec(),
            ]);
        });

        it('should return available true when organization name is available', async () => 
        {
            // Arrange
            const validateData = { name: 'Available Organization' };

            // Act
            const response = await request(app.getHttpServer())
                .post('/api/orgs/validate-name')
                .send(validateData)
                .expect(201);

            // Assert
            expect(response.body).toEqual({ available: true });
        });

        it('should return available false when organization name already exists for user', async () => 
        {
            // Arrange
            const subscription = await subscriptionModel.create({
                userId: testUser._id,
                stripeSubscriptionId: 'sub_test123',
                status: SubscriptionStatus.ACTIVE,
                autoRenew: true,
            });

            const existingOrgName = 'Existing Organization';
            await orgModel.create({
                name: existingOrgName,
                ownerId: testUser._id,
                subscriptionId: subscription._id,
                settings: { defaultCurrency: 'EUR' },
            });

            const validateData = { name: existingOrgName };

            // Act
            const response = await request(app.getHttpServer())
                .post('/api/orgs/validate-name')
                .send(validateData)
                .expect(201);

            // Assert
            expect(response.body).toEqual({ available: false });
        });

        it('should return available true when organization name exists but for different owner', async () => 
        {
            // Arrange - Create second user and their organization
            const testUser2 = await userService.create({
                email: 'test2@example.com',
                firstName: 'Jane',
                lastName: 'Smith',
                hashedPassword: 'hashedPassword456',
                phoneNumber: '+9876543210',
            });

            const subscription2 = await subscriptionModel.create({
                userId: testUser2._id,
                stripeSubscriptionId: 'sub_test456',
                status: SubscriptionStatus.ACTIVE,
                autoRenew: true,
            });

            const sharedName = 'Shared Organization Name';
            await orgModel.create({
                name: sharedName,
                ownerId: testUser2._id,
                subscriptionId: subscription2._id,
                settings: { defaultCurrency: 'EUR' },
            });

            const validateData = { name: sharedName };

            // Act - Check for testUser (not testUser2)
            const response = await request(app.getHttpServer())
                .post('/api/orgs/validate-name')
                .send(validateData)
                .expect(201);

            // Assert
            expect(response.body).toEqual({ available: true });
        });

        it('should return 400 when name is missing', async () => 
        {
            // Arrange
            const validateData = {};

            // Act
            const response = await request(app.getHttpServer())
                .post('/api/orgs/validate-name')
                .send(validateData)
                .expect(400);

            // Assert
            expect(response.body.message).toContain('validation.org.name.required');
        });

        it('should return 400 when name is not a string', async () => 
        {
            // Arrange
            const validateData = { name: 123 };

            // Act
            const response = await request(app.getHttpServer())
                .post('/api/orgs/validate-name')
                .send(validateData)
                .expect(400);

            // Assert
            expect(response.body.message).toContain('validation.org.name.mustBeString');
        });

        it('should return 400 when name is empty string', async () => 
        {
            // Arrange
            const validateData = { name: '' };

            // Act
            const response = await request(app.getHttpServer())
                .post('/api/orgs/validate-name')
                .send(validateData)
                .expect(400);

            // Assert
            expect(response.body.message).toContain('validation.org.name.required');
        });
    });
});
