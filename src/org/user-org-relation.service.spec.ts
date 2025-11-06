import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { UserOrgRelationService } from './user-org-relation.service';
import { UserOrgRelation, UserOrgRelationSchema, OrgRole } from './schemas/user-org-relation.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { Org, OrgSchema } from './schemas/org.schema';
import { DatabaseTestHelper } from '../../test/utils/database.helper';
import { CustomLogger } from '../common/logger/custom.logger';

describe('UserOrgRelationService - Service Tests (Unit-style)', () => 
{
    let service: UserOrgRelationService;
    let connection: Connection;
    let module: TestingModule;
    let mockLogger: jest.Mocked<CustomLogger>;

    const mockUserId1 = new Types.ObjectId();
    const mockUserId2 = new Types.ObjectId();
    const mockOrgId1 = new Types.ObjectId();
    const mockOrgId2 = new Types.ObjectId();
    const mockSubscriptionId1 = new Types.ObjectId();
    const mockSubscriptionId2 = new Types.ObjectId();

    const mockRelationData = [
        {
            userId: mockUserId1,
            orgId: mockOrgId1,
            orgRole: OrgRole.OWNER,
        },
        {
            userId: mockUserId1,
            orgId: mockOrgId2,
            orgRole: OrgRole.MANAGER,
        },
        {
            userId: mockUserId2,
            orgId: mockOrgId1,
            orgRole: OrgRole.STAFF,
        },
    ];

    beforeAll(async () => 
    {
        mockLogger = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
        } as any;

        module = await Test.createTestingModule({
            imports: [
                DatabaseTestHelper.getMongooseTestModule(),
                MongooseModule.forFeature([
                    { name: UserOrgRelation.name, schema: UserOrgRelationSchema },
                    { name: User.name, schema: UserSchema },
                    { name: Org.name, schema: OrgSchema },
                ]),
            ],
            providers: [
                UserOrgRelationService,
                {
                    provide: CustomLogger,
                    useValue: mockLogger,
                },
            ],
        }).compile();

        service = module.get<UserOrgRelationService>(UserOrgRelationService);
        connection = module.get<Connection>(getConnectionToken());
    });

    beforeEach(async () => 
    {
        await DatabaseTestHelper.clearDatabase(connection);
    });

    afterAll(async () => 
    {
        await module.close();
        await DatabaseTestHelper.stopInMemoryDatabase();
    });

    it('should be defined', () => 
    {
        expect(service).toBeDefined();
    });

    describe('findAll', () => 
    {
        beforeEach(async () => 
        {
            // Create test users
            const userModel = connection.model('User');
            await userModel.insertMany([
                {
                    _id: mockUserId1,
                    email: 'user1@test.com',
                    firstName: 'User',
                    lastName: 'One',
                    hashedPassword: 'hashed',
                    isEmailVerified: true,
                },
                {
                    _id: mockUserId2,
                    email: 'user2@test.com',
                    firstName: 'User',
                    lastName: 'Two',
                    hashedPassword: 'hashed',
                    isEmailVerified: true,
                },
            ]);

            // Create test organizations
            const orgModel = connection.model('Org');
            await orgModel.insertMany([
                {
                    _id: mockOrgId1,
                    name: 'Org One',
                    ownerId: mockUserId1,
                    subscriptionId: mockSubscriptionId1,
                    settings: { defaultCurrency: 'EUR' },
                },
                {
                    _id: mockOrgId2,
                    name: 'Org Two',
                    ownerId: mockUserId1,
                    subscriptionId: mockSubscriptionId2,
                    settings: { defaultCurrency: 'EUR' },
                },
            ]);

            // Create test relationships
            const relationModel = connection.model('UserOrgRelation');
            await relationModel.insertMany(mockRelationData);
        });

        it('should return all user-org relations for a user without role filter', async () => 
        {
            // Act
            const result = await service.findAll(mockUserId1);

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0].userId._id.toString()).toBe(mockUserId1.toString());
            expect(result[1].userId._id.toString()).toBe(mockUserId1.toString());
            
            // Verify both relations are returned
            const orgIds = result.map(r => r.orgId._id.toString());
            expect(orgIds).toContain(mockOrgId1.toString());
            expect(orgIds).toContain(mockOrgId2.toString());
        });

        it('should filter user-org relations by specific role', async () => 
        {
            // Act
            const result = await service.findAll(mockUserId1, OrgRole.OWNER);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].userId._id.toString()).toBe(mockUserId1.toString());
            expect(result[0].orgId._id.toString()).toBe(mockOrgId1.toString());
            expect(result[0].orgRole).toBe(OrgRole.OWNER);
        });

        it('should return empty array when user has no relations', async () => 
        {
            // Arrange
            const nonExistentUserId = new Types.ObjectId();

            // Act
            const result = await service.findAll(nonExistentUserId);

            // Assert
            expect(result).toHaveLength(0);
        });

        it('should return empty array when user has no relations with specified role', async () => 
        {
            // Act - mockUserId2 only has STAFF role, not OWNER
            const result = await service.findAll(mockUserId2, OrgRole.OWNER);

            // Assert
            expect(result).toHaveLength(0);
        });

        it('should return all roles when orgRole is null', async () => 
        {
            // Act
            const result = await service.findAll(mockUserId1, null as any);

            // Assert
            expect(result).toHaveLength(2);
        });

        it('should return all roles when orgRole is undefined', async () => 
        {
            // Act
            const result = await service.findAll(mockUserId1, undefined as any);

            // Assert
            expect(result).toHaveLength(2);
        });

        it('should return all user-org relations for a specific organization', async () => 
        {
            // Act
            const result = await service.findAll(undefined, undefined, mockOrgId1);

            // Assert
            expect(result).toHaveLength(2); // Both mockUserId1 and mockUserId2 are related to mockOrgId1
            expect(result[0].orgId._id.toString()).toBe(mockOrgId1.toString());
            expect(result[1].orgId._id.toString()).toBe(mockOrgId1.toString());
            
            // Verify different users are included
            const userIds = result.map(r => r.userId._id.toString());
            expect(userIds).toContain(mockUserId1.toString());
            expect(userIds).toContain(mockUserId2.toString());
        });

        it('should filter by both userId and orgId', async () => 
        {
            // Act
            const result = await service.findAll(mockUserId1, undefined, mockOrgId2);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].userId._id.toString()).toBe(mockUserId1.toString());
            expect(result[0].orgId._id.toString()).toBe(mockOrgId2.toString());
            expect(result[0].orgRole).toBe(OrgRole.MANAGER);
        });

        it('should filter by userId, orgRole, and orgId', async () => 
        {
            // Act
            const result = await service.findAll(mockUserId1, OrgRole.OWNER, mockOrgId1);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].userId._id.toString()).toBe(mockUserId1.toString());
            expect(result[0].orgId._id.toString()).toBe(mockOrgId1.toString());
            expect(result[0].orgRole).toBe(OrgRole.OWNER);
        });

        it('should return empty array when no relations match all filters', async () => 
        {
            // Act - mockUserId1 has OWNER role in mockOrgId1, but we're looking for STAFF
            const result = await service.findAll(mockUserId1, OrgRole.STAFF, mockOrgId1);

            // Assert
            expect(result).toHaveLength(0);
        });

        it('should return empty array when orgId has no relations', async () => 
        {
            // Arrange
            const nonExistentOrgId = new Types.ObjectId();

            // Act
            const result = await service.findAll(undefined, undefined, nonExistentOrgId);

            // Assert
            expect(result).toHaveLength(0);
        });
    });

    describe('findOne', () => 
    {
        beforeEach(async () => 
        {
            // Create test relationships
            const relationModel = connection.model('UserOrgRelation');
            await relationModel.insertMany(mockRelationData);
        });

        it('should return specific user-org relation when found', async () => 
        {
            // Act
            const result = await service.findOne(mockUserId1, mockOrgId1);

            // Assert
            expect(result).toBeDefined();
            expect(result!.userId.toString()).toBe(mockUserId1.toString());
            expect(result!.orgId.toString()).toBe(mockOrgId1.toString());
            expect(result!.orgRole).toBe(OrgRole.OWNER);
        });

        it('should return null when relationship not found', async () => 
        {
            // Arrange
            const nonExistentOrgId = new Types.ObjectId();

            // Act
            const result = await service.findOne(mockUserId1, nonExistentOrgId);

            // Assert
            expect(result).toBeNull();
        });

        it('should return null when user does not exist', async () => 
        {
            // Arrange
            const nonExistentUserId = new Types.ObjectId();

            // Act
            const result = await service.findOne(nonExistentUserId, mockOrgId1);

            // Assert
            expect(result).toBeNull();
        });

        it('should verify database contains correct relationship data', async () => 
        {
            // Act
            const result = await service.findOne(mockUserId1, mockOrgId2);

            // Assert - Verify the specific relationship from our test data
            expect(result).toBeDefined();
            expect(result!.orgRole).toBe(OrgRole.MANAGER);
            expect(result!.userId.toString()).toBe(mockUserId1.toString());
            expect(result!.orgId.toString()).toBe(mockOrgId2.toString());

            // Verify this is the expected relationship from our mock data
            const expectedRelation = mockRelationData.find(
                r => r.userId._id.toString() === mockUserId1.toString() && r.orgId._id.toString() === mockOrgId2.toString()
            );
            expect(expectedRelation).toBeDefined();
            expect(result!.orgRole).toBe(expectedRelation!.orgRole);
        });

        it('should handle string conversion of ObjectIds correctly', async () => 
        {
            // Act - Test with ObjectId objects converted to strings
            const result = await service.findOne(
                mockUserId2,
                mockOrgId1
            );

            // Assert
            expect(result).toBeDefined();
            expect(result!.orgRole).toBe(OrgRole.STAFF);
        });
    });

    describe('updateRole', () => 
    {
        beforeEach(async () => 
        {
            // Create test relationships
            const relationModel = connection.model('UserOrgRelation');
            await relationModel.insertMany(mockRelationData);
        });

        it('should update user role successfully', async () => 
        {
            // Act
            const result = await service.updateRole(mockUserId1, mockOrgId1, OrgRole.MANAGER);

            // Assert - Verify return value
            expect(result).toBeDefined();
            expect(result.userId.toString()).toBe(mockUserId1.toString());
            expect(result.orgId.toString()).toBe(mockOrgId1.toString());
            expect(result.orgRole).toBe(OrgRole.MANAGER);

            // Assert - Verify database state
            const relationModel = connection.model('UserOrgRelation');
            const updatedRelation = await relationModel.findOne({
                userId: mockUserId1,
                orgId: mockOrgId1,
            });
            expect(updatedRelation!.orgRole).toBe(OrgRole.MANAGER);
        });

        it('should update from any role to any other role', async () => 
        {
            // Arrange - Start with STAFF role
            const relationModel = connection.model('UserOrgRelation');
            await relationModel.findOneAndUpdate(
                { userId: mockUserId1, orgId: mockOrgId1 },
                { $set: { orgRole: OrgRole.STAFF } }
            );

            // Act - Update to MANAGER
            const result = await service.updateRole(mockUserId1, mockOrgId1, OrgRole.MANAGER);

            // Assert
            expect(result.orgRole).toBe(OrgRole.MANAGER);

            // Verify database state
            const updatedRelation = await relationModel.findOne({
                userId: mockUserId1,
                orgId: mockOrgId1,
            });
            expect(updatedRelation!.orgRole).toBe(OrgRole.MANAGER);
        });

        it('should throw NotFoundException when relationship not found', async () => 
        {
            // Arrange
            const nonExistentUserId = new Types.ObjectId();

            // Act & Assert
            await expect(service.updateRole(nonExistentUserId, mockOrgId1, OrgRole.MANAGER))
                .rejects
                .toThrow('is not a member of organization');
        });

        it('should throw NotFoundException when organization not found', async () => 
        {
            // Arrange
            const nonExistentOrgId = new Types.ObjectId();

            // Act & Assert
            await expect(service.updateRole(mockUserId1, nonExistentOrgId, OrgRole.MANAGER))
                .rejects
                .toThrow('is not a member of organization');
        });

        it('should handle all valid OrgRole values', async () => 
        {
            const validRoles = [OrgRole.OWNER, OrgRole.MANAGER, OrgRole.STAFF];

            for (const role of validRoles) 
            {
                // Act
                const result = await service.updateRole(mockUserId1, mockOrgId1, role);

                // Assert
                expect(result.orgRole).toBe(role);

                // Verify database state
                const relationModel = connection.model('UserOrgRelation');
                const updatedRelation = await relationModel.findOne({
                    userId: mockUserId1,
                    orgId: mockOrgId1,
                });
                expect(updatedRelation!.orgRole).toBe(role);
            }
        });

        it('should return updated document with correct structure', async () => 
        {
            // Act
            const result = await service.updateRole(mockUserId1, mockOrgId1, OrgRole.STAFF);

            // Assert - Verify document structure
            expect(result).toHaveProperty('userId');
            expect(result).toHaveProperty('orgId');
            expect(result).toHaveProperty('orgRole');
            expect(result).toHaveProperty('createdAt');
            expect(result).toHaveProperty('updatedAt');
            
            // Verify types
            expect(result.userId).toBeInstanceOf(Types.ObjectId);
            expect(result.orgId).toBeInstanceOf(Types.ObjectId);
            expect(typeof result.orgRole).toBe('string');
        });
    });
});
