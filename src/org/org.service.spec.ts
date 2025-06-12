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
            const result = await service.findById(createdOrg._id.toString());

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
            const result = await service.findById(nonExistentId.toString());

            // Assert
            expect(result).toBeNull();
        });

        it('should handle invalid ObjectId format gracefully', async () => 
        {
            // Arrange
            const invalidId = 'invalid-id' as any;

            // Act & Assert
            await expect(service.findById(invalidId)).rejects.toThrow();
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
            const result = await service.findById(createdOrg._id.toString());

            // Assert
            expect(result).toBeDefined();
            expect(result!.settings.defaultCurrency).toBe('EUR'); // Default from schema
        });
    });
});
