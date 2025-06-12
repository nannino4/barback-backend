import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { OrgService } from './org.service';
import { Org, OrgSchema } from './schemas/org.schema';
import { UserOrgRelation, UserOrgRelationSchema } from './schemas/user-org-relation.schema';
import { DatabaseTestHelper } from '../../test/utils/database.helper';

describe('OrgService - Service Tests (Unit-style)', () => 
{
    let service: OrgService;
    let connection: Connection;
    let module: TestingModule;

    const mockUserId = new Types.ObjectId();
    const mockSubscriptionId = new Types.ObjectId();
    const mockOrgData = {
        name: 'Test Organization',
        ownerId: mockUserId,
        subscriptionId: mockSubscriptionId,
        settings: {
            defaultCurrency: 'USD',
        },
    };

    beforeAll(async () => 
    {
        module = await Test.createTestingModule({
            imports: [
                DatabaseTestHelper.getMongooseTestModule(),
                MongooseModule.forFeature([
                    { name: Org.name, schema: OrgSchema },
                    { name: UserOrgRelation.name, schema: UserOrgRelationSchema },
                ]),
            ],
            providers: [OrgService],
        }).compile();

        service = module.get<OrgService>(OrgService);
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

    describe('findById', () => 
    {
        it('should return organization when found', async () => 
        {
            // Arrange
            const orgModel = connection.model('Org');
            const createdOrg = await orgModel.create(mockOrgData);

            // Act
            const result = await service.findById(createdOrg._id);

            // Assert
            expect(result).toBeDefined();
            expect(result!.id).toBe(createdOrg._id.toString());
            expect(result!.name).toBe(mockOrgData.name);
            expect(result!.ownerId.toString()).toBe(mockOrgData.ownerId.toString());
            expect(result!.subscriptionId.toString()).toBe(mockOrgData.subscriptionId.toString());
            expect(result!.settings.defaultCurrency).toBe(mockOrgData.settings.defaultCurrency);
        });

        it('should return null when organization not found', async () => 
        {
            // Arrange
            const nonExistentId = new Types.ObjectId();

            // Act
            const result = await service.findById(nonExistentId);

            // Assert
            expect(result).toBeNull();
        });

        it('should return organization with default settings when none provided', async () => 
        {
            // Arrange
            const orgWithoutSettings = {
                name: 'Org Without Settings',
                ownerId: mockUserId,
                subscriptionId: new Types.ObjectId(),
            };
            const orgModel = connection.model('Org');
            const createdOrg = await orgModel.create(orgWithoutSettings);

            // Act
            const result = await service.findById(createdOrg._id);

            // Assert
            expect(result).toBeDefined();
            expect(result!.settings.defaultCurrency).toBe('EUR'); // Default from schema
        });
    });

    describe('update', () => 
    {
        it('should update organization name when provided', async () => 
        {
            // Arrange
            const orgModel = connection.model('Org');
            const createdOrg = await orgModel.create(mockOrgData);
            const updateData = { name: 'Updated Organization Name' };

            // Act
            const result = await service.update(createdOrg._id.toString(), updateData);

            // Assert - Verify return value
            expect(result).toBeDefined();
            expect(result.name).toBe(updateData.name);
            expect(result.ownerId.toString()).toBe(mockOrgData.ownerId.toString());
            
            // Assert - Verify database state
            const orgInDb = await orgModel.findById(createdOrg._id);
            expect(orgInDb!.name).toBe(updateData.name);
            expect(orgInDb!.ownerId.toString()).toBe(mockOrgData.ownerId.toString());
        });

        it('should update organization settings when provided', async () => 
        {
            // Arrange
            const orgModel = connection.model('Org');
            const createdOrg = await orgModel.create(mockOrgData);
            const updateData = { 
                settings: { 
                    defaultCurrency: 'GBP', 
                }, 
            };

            // Act
            const result = await service.update(createdOrg._id.toString(), updateData);

            // Assert - Verify return value
            expect(result).toBeDefined();
            expect(result.settings.defaultCurrency).toBe('GBP');
            expect(result.name).toBe(mockOrgData.name); // Original name unchanged
            
            // Assert - Verify database state
            const orgInDb = await orgModel.findById(createdOrg._id);
            expect(orgInDb!.settings.defaultCurrency).toBe('GBP');
            expect(orgInDb!.name).toBe(mockOrgData.name);
        });

        it('should update both name and settings when both provided', async () => 
        {
            // Arrange
            const orgModel = connection.model('Org');
            const createdOrg = await orgModel.create(mockOrgData);
            const updateData = { 
                name: 'New Name',
                settings: { 
                    defaultCurrency: 'JPY', 
                }, 
            };

            // Act
            const result = await service.update(createdOrg._id.toString(), updateData);

            // Assert - Verify return value
            expect(result).toBeDefined();
            expect(result.name).toBe('New Name');
            expect(result.settings.defaultCurrency).toBe('JPY');
            
            // Assert - Verify database state
            const orgInDb = await orgModel.findById(createdOrg._id);
            expect(orgInDb!.name).toBe('New Name');
            expect(orgInDb!.settings.defaultCurrency).toBe('JPY');
        });

        it('should throw NotFoundException when organization does not exist', async () => 
        {
            // Arrange
            const nonExistentId = new Types.ObjectId();
            const updateData = { name: 'Updated Name' };

            // Act & Assert
            await expect(service.update(nonExistentId, updateData))
                .rejects
                .toThrow('Organization with ID "' + nonExistentId.toString() + '" not found');
        });

        it('should validate data when updating with invalid name', async () => 
        {
            // Arrange
            const orgModel = connection.model('Org');
            const createdOrg = await orgModel.create(mockOrgData);
            const updateData = { 
                name: null as any, // Invalid name type
            };

            // Act & Assert
            await expect(service.update(createdOrg._id.toString(), updateData))
                .rejects
                .toThrow();
        });

        it('should not modify other fields when updating specific ones', async () => 
        {
            // Arrange
            const orgModel = connection.model('Org');
            const createdOrg = await orgModel.create(mockOrgData);
            const updateData = { name: 'Only Name Updated' };
            const originalOwnerId = createdOrg.ownerId;
            const originalSubscriptionId = createdOrg.subscriptionId;

            // Act
            const result = await service.update(createdOrg._id.toString(), updateData);

            // Assert - Verify other fields unchanged
            expect(result.ownerId.toString()).toBe(originalOwnerId.toString());
            expect(result.subscriptionId.toString()).toBe(originalSubscriptionId.toString());
            expect(result.settings.defaultCurrency).toBe(mockOrgData.settings.defaultCurrency);
            
            // Assert - Verify database state
            const orgInDb = await orgModel.findById(createdOrg._id);
            expect(orgInDb!.ownerId.toString()).toBe(originalOwnerId.toString());
            expect(orgInDb!.subscriptionId.toString()).toBe(originalSubscriptionId.toString());
        });
    });
});
