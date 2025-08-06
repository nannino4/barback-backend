import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { UserOrgRelationService } from './user-org-relation.service';
import { UserOrgRelation, UserOrgRelationSchema, OrgRole } from './schemas/user-org-relation.schema';
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
            expect(result[0].userId.toString()).toBe(mockUserId1.toString());
            expect(result[1].userId.toString()).toBe(mockUserId1.toString());
            
            // Verify both relations are returned
            const orgIds = result.map(r => r.orgId.toString());
            expect(orgIds).toContain(mockOrgId1.toString());
            expect(orgIds).toContain(mockOrgId2.toString());
        });

        it('should filter user-org relations by specific role', async () => 
        {
            // Act
            const result = await service.findAll(mockUserId1, OrgRole.OWNER);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].userId.toString()).toBe(mockUserId1.toString());
            expect(result[0].orgId.toString()).toBe(mockOrgId1.toString());
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
            expect(result[0].orgId.toString()).toBe(mockOrgId1.toString());
            expect(result[1].orgId.toString()).toBe(mockOrgId1.toString());
            
            // Verify different users are included
            const userIds = result.map(r => r.userId.toString());
            expect(userIds).toContain(mockUserId1.toString());
            expect(userIds).toContain(mockUserId2.toString());
        });

        it('should filter by both userId and orgId', async () => 
        {
            // Act
            const result = await service.findAll(mockUserId1, undefined, mockOrgId2);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].userId.toString()).toBe(mockUserId1.toString());
            expect(result[0].orgId.toString()).toBe(mockOrgId2.toString());
            expect(result[0].orgRole).toBe(OrgRole.MANAGER);
        });

        it('should filter by userId, orgRole, and orgId', async () => 
        {
            // Act
            const result = await service.findAll(mockUserId1, OrgRole.OWNER, mockOrgId1);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].userId.toString()).toBe(mockUserId1.toString());
            expect(result[0].orgId.toString()).toBe(mockOrgId1.toString());
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

    describe('create', () => 
    {
        it('should create user-org relationship successfully', async () => 
        {
            // Act
            const result = await service.create(mockUserId1, mockOrgId1, OrgRole.OWNER);

            // Assert - Verify return value
            expect(result).toBeDefined();
            expect(result.userId.toString()).toBe(mockUserId1.toString());
            expect(result.orgId.toString()).toBe(mockOrgId1.toString());
            expect(result.orgRole).toBe(OrgRole.OWNER);
            expect(result).toHaveProperty('createdAt');
            expect(result).toHaveProperty('updatedAt');

            // Assert - Verify database state
            const relationModel = connection.model('UserOrgRelation');
            const createdRelation = await relationModel.findOne({
                userId: mockUserId1,
                orgId: mockOrgId1,
            });
            expect(createdRelation).toBeDefined();
            expect(createdRelation!.orgRole).toBe(OrgRole.OWNER);
        });

        it('should create relationships with different roles', async () => 
        {
            const testRoles = [OrgRole.OWNER, OrgRole.MANAGER, OrgRole.STAFF];
            
            for (let i = 0; i < testRoles.length; i++) 
            {
                const userId = new Types.ObjectId();
                const orgId = new Types.ObjectId();
                const role = testRoles[i];
                
                // Act
                const result = await service.create(userId, orgId, role);
                
                // Assert
                expect(result.orgRole).toBe(role);
                expect(result.userId.toString()).toBe(userId.toString());
                expect(result.orgId.toString()).toBe(orgId.toString());
            }
        });

        it('should create multiple relationships for same user in different orgs', async () => 
        {
            // Arrange
            const userId = mockUserId1;
            const org1 = mockOrgId1;
            const org2 = mockOrgId2;

            // Act
            const relation1 = await service.create(userId, org1, OrgRole.OWNER);
            const relation2 = await service.create(userId, org2, OrgRole.MANAGER);

            // Assert
            expect(relation1.userId.toString()).toBe(userId.toString());
            expect(relation1.orgId.toString()).toBe(org1.toString());
            expect(relation1.orgRole).toBe(OrgRole.OWNER);
            
            expect(relation2.userId.toString()).toBe(userId.toString());
            expect(relation2.orgId.toString()).toBe(org2.toString());
            expect(relation2.orgRole).toBe(OrgRole.MANAGER);

            // Verify both exist in database
            const relationModel = connection.model('UserOrgRelation');
            const allRelations = await relationModel.find({ userId }).exec();
            expect(allRelations).toHaveLength(2);
        });

        it('should create multiple relationships for different users in same org', async () => 
        {
            // Arrange
            const user1 = mockUserId1;
            const user2 = mockUserId2;
            const orgId = mockOrgId1;

            // Act
            const relation1 = await service.create(user1, orgId, OrgRole.OWNER);
            const relation2 = await service.create(user2, orgId, OrgRole.STAFF);

            // Assert
            expect(relation1.userId.toString()).toBe(user1.toString());
            expect(relation1.orgRole).toBe(OrgRole.OWNER);
            
            expect(relation2.userId.toString()).toBe(user2.toString());
            expect(relation2.orgRole).toBe(OrgRole.STAFF);

            // Verify both exist in database
            const relationModel = connection.model('UserOrgRelation');
            const allRelations = await relationModel.find({ orgId }).exec();
            expect(allRelations).toHaveLength(2);
        });

        it('should return document with correct structure and types', async () => 
        {
            // Act
            const result = await service.create(mockUserId1, mockOrgId1, OrgRole.MANAGER);

            // Assert - Verify document structure
            expect(result).toHaveProperty('userId');
            expect(result).toHaveProperty('orgId');
            expect(result).toHaveProperty('orgRole');
            expect(result).toHaveProperty('_id');
            
            // Verify types
            expect(result.userId).toBeInstanceOf(Types.ObjectId);
            expect(result.orgId).toBeInstanceOf(Types.ObjectId);
            expect(typeof result.orgRole).toBe('string');
            
            // Verify timestamps exist (they're added by mongoose timestamps: true)
            const resultObject = result.toObject();
            expect(resultObject).toHaveProperty('createdAt');
            expect(resultObject).toHaveProperty('updatedAt');
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
                r => r.userId.toString() === mockUserId1.toString() && r.orgId.toString() === mockOrgId2.toString()
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
