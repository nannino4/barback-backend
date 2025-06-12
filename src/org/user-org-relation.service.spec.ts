import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { UserOrgRelationService } from './user-org-relation.service';
import { UserOrgRelation, UserOrgRelationSchema, OrgRole } from './schemas/user-org-relation.schema';
import { DatabaseTestHelper } from '../../test/utils/database.helper';

describe('UserOrgRelationService - Service Tests (Unit-style)', () => 
{
    let service: UserOrgRelationService;
    let connection: Connection;
    let module: TestingModule;

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
        module = await Test.createTestingModule({
            imports: [
                DatabaseTestHelper.getMongooseTestModule(),
                MongooseModule.forFeature([
                    { name: UserOrgRelation.name, schema: UserOrgRelationSchema },
                ]),
            ],
            providers: [UserOrgRelationService],
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
});
