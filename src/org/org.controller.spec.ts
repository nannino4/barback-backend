import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as request from 'supertest';
import { JwtModule } from '@nestjs/jwt';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';
import { UserOrgRelationService } from './user-org-relation.service';
import { Org, OrgSchema } from './schemas/org.schema';
import { UserOrgRelation, UserOrgRelationSchema, OrgRole } from './schemas/user-org-relation.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from '../user/user.service';
import { Types } from 'mongoose';

describe('OrgController (Integration)', () => 
{
    let app: INestApplication;
    let mongoServer: MongoMemoryServer;
    let userService: UserService;
    let testUser: User;
    let testOrgs: Org[];

    beforeAll(async () => 
    {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                MongooseModule.forRoot(mongoUri),
                MongooseModule.forFeature([
                    { name: User.name, schema: UserSchema },
                    { name: Org.name, schema: OrgSchema },
                    { name: UserOrgRelation.name, schema: UserOrgRelationSchema },
                ]),
                JwtModule.register({
                    secret: 'test-secret',
                    signOptions: { expiresIn: '1h' },
                }),
            ],
            controllers: [OrgController],
            providers: [OrgService, UserOrgRelationService, UserService],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: () => true, // Will be overridden in beforeEach
            })
            .compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));

        userService = moduleFixture.get<UserService>(UserService);

        await app.init();
    });

    afterAll(async () => 
    {
        await app.close();
        await mongoServer.stop();
    });

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

        // Create test organizations - using direct model access for setup
        const orgModel = app.get('OrgModel');
        const subscriptionId1 = new Types.ObjectId();
        const subscriptionId2 = new Types.ObjectId();
        const subscriptionId3 = new Types.ObjectId();

        const createdOrgs = await orgModel.insertMany([
            {
                name: 'Organization 1',
                ownerId: testUser.id,
                subscriptionId: subscriptionId1,
                settings: { defaultCurrency: 'USD' },
            },
            {
                name: 'Organization 2', 
                ownerId: testUser.id,
                subscriptionId: subscriptionId2,
                settings: { defaultCurrency: 'EUR' },
            },
            {
                name: 'Organization 3',
                ownerId: new Types.ObjectId(), // Different owner
                subscriptionId: subscriptionId3,
                settings: { defaultCurrency: 'GBP' },
            },
        ]);

        testOrgs = createdOrgs;

        // Create test user-org relations
        const relationModel = app.get('UserOrgRelationModel');
        await relationModel.insertMany([
            {
                userId: testUser.id,
                orgId: testOrgs[0]._id,
                orgRole: OrgRole.OWNER,
            },
            {
                userId: testUser.id,
                orgId: testOrgs[1]._id,
                orgRole: OrgRole.MANAGER,
            },
            {
                userId: testUser.id,
                orgId: testOrgs[2]._id,
                orgRole: OrgRole.STAFF,
            },
        ]);

        // Override guard to use the created test user
        const moduleRef = app.get(JwtAuthGuard);
        jest.spyOn(moduleRef, 'canActivate').mockImplementation(async (context) => 
        {
            const request = context.switchToHttp().getRequest();
            // Get fresh user data from database to ensure updates are reflected
            const freshUser = await userService.findById(testUser.id);
            request.user = freshUser;
            return true;
        });
    });

    afterEach(async () => 
    {
        // Clean up database after each test
        const userModel = app.get('UserModel');
        const orgModel = app.get('OrgModel');
        const relationModel = app.get('UserOrgRelationModel');
        
        await Promise.all([
            userModel.deleteMany({}).exec(),
            orgModel.deleteMany({}).exec(),
            relationModel.deleteMany({}).exec(),
        ]);
    });

    describe('GET /orgs', () => 
    {
        it('should return all user organizations without role filter', async () => 
        {
            const response = await request(app.getHttpServer())
                .get('/orgs')
                .expect(200);

            expect(response.body).toHaveLength(3);
            
            // Verify each organization relation has basic structure
            response.body.forEach((orgRelation: any) => 
            {
                expect(orgRelation).toHaveProperty('role');
                expect(Object.values(OrgRole)).toContain(orgRelation.role);
            });

            // Verify all roles are included
            const roles = response.body.map((rel: any) => rel.role);
            expect(roles).toContain(OrgRole.OWNER);
            expect(roles).toContain(OrgRole.MANAGER);
            expect(roles).toContain(OrgRole.STAFF);
        });

        it('should filter organizations by OWNER role', async () => 
        {
            const response = await request(app.getHttpServer())
                .get('/orgs?orgRole=owner')
                .expect(200);

            expect(response.body).toHaveLength(1);
            expect(response.body[0].role).toBe(OrgRole.OWNER);
            expect(response.body[0].org.name).toBe('Organization 1');
        });

        it('should filter organizations by MANAGER role', async () => 
        {
            const response = await request(app.getHttpServer())
                .get('/orgs?orgRole=manager')
                .expect(200);

            expect(response.body).toHaveLength(1);
            expect(response.body[0].role).toBe(OrgRole.MANAGER);
            expect(response.body[0].org.name).toBe('Organization 2');
        });

        it('should filter organizations by STAFF role', async () => 
        {
            const response = await request(app.getHttpServer())
                .get('/orgs?orgRole=staff')
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
                .get('/orgs?orgRole=owner')
                .expect(200);

            expect(response.body).toHaveLength(0);
        });

        it('should handle invalid role filter gracefully', async () => 
        {
            const response = await request(app.getHttpServer())
                .get('/orgs?orgRole=invalid_role')
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
                .get('/orgs')
                .expect(403);
        });

        it('should handle case when organization is deleted but relation exists', async () => 
        {
            // Delete one organization but keep the relation
            const orgModel = app.get('OrgModel');
            await orgModel.findByIdAndDelete(testOrgs[0]._id).exec();

            const response = await request(app.getHttpServer())
                .get('/orgs')
                .expect(409); // ConflictException

            expect(response.body.message).toContain('Organization not found for relation');
        });

        it('should return organizations in correct DTO format', async () => 
        {
            const response = await request(app.getHttpServer())
                .get('/orgs')
                .expect(200);

            expect(response.body).toHaveLength(3);

            response.body.forEach((orgRelation: any) => 
            {
                // Verify DTO structure matches OutUserOrgRelationDto
                expect(orgRelation).toEqual({
                    org: {
                        id: expect.any(String),
                        name: expect.any(String),
                    },
                    role: expect.any(String),
                });

                // Verify role is a valid OrgRole
                expect(Object.values(OrgRole)).toContain(orgRelation.role);

                // Verify org ID is a valid ObjectId string
                expect(orgRelation.org.id).toMatch(/^[0-9a-fA-F]{24}$/);
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
                userId: anotherUser.id,
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
                .get('/orgs')
                .expect(200);

            // Should only return the one organization the other user has access to
            expect(response.body).toHaveLength(1);
            expect(response.body[0].role).toBe(OrgRole.STAFF);
            expect(response.body[0].org.name).toBe('Organization 1');
        });
    });
});
