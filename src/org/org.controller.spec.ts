import { Test, TestingModule } from '@nestjs/testing';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { UpdateOrgDto } from './dto/update-org.dto';
import { AddUserToOrgDto } from './dto/add-user-to-org.dto';
import { UpdateUserRoleInOrgDto } from './dto/update-user-role-in-org.dto';
import { OrgRole } from './schemas/user-org.schema';
import { createMockOrg, createMockUser } from '../__tests__/test-utils';

describe('OrgController', () => 
{
    let controller: OrgController;
    let service: OrgService;

    const mockOrgService = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        addUserToOrg: jest.fn(),
        getUsersInOrg: jest.fn(),
        updateUserRoleInOrg: jest.fn(),
        removeUserFromOrg: jest.fn(),
    };

    beforeEach(async () => 
    {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [OrgController],
            providers: [
                {
                    provide: OrgService,
                    useValue: mockOrgService,
                },
            ],
        }).compile();

        controller = module.get<OrgController>(OrgController);
        service = module.get<OrgService>(OrgService);
    });

    afterEach(() => 
    {
        jest.clearAllMocks();
    });

    describe('create', () => 
    {
        it('should create a new organization', async () => 
        {
            // Arrange
            const createOrgDto: CreateOrgDto = {
                name: 'Test Org',
                ownerId: '507f1f77bcf86cd799439011',
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    postalCode: '10001',
                    country: 'USA',
                },
                fiscalData: {
                    companyName: 'Test Company LLC',
                    taxId: '123456789',
                    vatNumber: 'VAT123456',
                    fiscalCode: 'FC123456',
                    legalEntityType: 'LLC',
                    fiscalAddress: {
                        street: '456 Business Ave',
                        city: 'New York',
                        state: 'NY',
                        postalCode: '10002',
                        country: 'USA',
                    },
                },
                settings: {
                    defaultCurrency: 'USD',
                },
            };
            const mockOrg = createMockOrg(createOrgDto);
            mockOrgService.create.mockResolvedValue(mockOrg);

            // Act
            const result = await controller.create(createOrgDto);

            // Assert
            expect(service.create).toHaveBeenCalledWith(createOrgDto);
            expect(result).toEqual(mockOrg);
        });

        it('should handle service errors during creation', async () => 
        {
            // Arrange
            const createOrgDto: CreateOrgDto = {
                name: 'Test Org',
                ownerId: '507f1f77bcf86cd799439011',
            };
            const error = new Error('Creation failed');
            mockOrgService.create.mockRejectedValue(error);

            // Act & Assert
            await expect(controller.create(createOrgDto)).rejects.toThrow('Creation failed');
            expect(service.create).toHaveBeenCalledWith(createOrgDto);
        });
    });

    describe('findAll', () => 
    {
        it('should return all organizations with default pagination', async () => 
        {
            // Arrange
            const mockOrgs = [
                createMockOrg({ name: 'Org 1' }),
                createMockOrg({ name: 'Org 2' }),
            ];
            mockOrgService.findAll.mockResolvedValue(mockOrgs);

            // Act
            const result = await controller.findAll();

            // Assert
            expect(service.findAll).toHaveBeenCalledWith(10, 0);
            expect(result).toEqual(mockOrgs);
        });

        it('should return organizations with custom pagination', async () => 
        {
            // Arrange
            const limit = 20;
            const offset = 5;
            const mockOrgs = [createMockOrg({ name: 'Org 1' })];
            mockOrgService.findAll.mockResolvedValue(mockOrgs);

            // Act
            const result = await controller.findAll(limit, offset);

            // Assert
            expect(service.findAll).toHaveBeenCalledWith(limit, offset);
            expect(result).toEqual(mockOrgs);
        });

        it('should handle service errors during findAll', async () => 
        {
            // Arrange
            const error = new Error('Database error');
            mockOrgService.findAll.mockRejectedValue(error);

            // Act & Assert
            await expect(controller.findAll()).rejects.toThrow('Database error');
        });
    });

    describe('findOne', () => 
    {
        it('should return a specific organization', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            const mockOrg = createMockOrg({ _id: orgId });
            mockOrgService.findOne.mockResolvedValue(mockOrg);

            // Act
            const result = await controller.findOne(orgId);

            // Assert
            expect(service.findOne).toHaveBeenCalledWith(orgId);
            expect(result).toEqual(mockOrg);
        });

        it('should handle not found errors', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            const error = new Error('Organization not found');
            mockOrgService.findOne.mockRejectedValue(error);

            // Act & Assert
            await expect(controller.findOne(orgId)).rejects.toThrow('Organization not found');
            expect(service.findOne).toHaveBeenCalledWith(orgId);
        });
    });

    describe('update', () => 
    {
        it('should update an organization', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            const updateOrgDto: UpdateOrgDto = {
                name: 'Updated Org Name',
                address: {
                    street: '789 Updated St',
                    city: 'Updated City',
                },
                settings: {
                    defaultCurrency: 'EUR',
                },
            };
            const updatedOrg = createMockOrg({ _id: orgId, ...updateOrgDto });
            mockOrgService.update.mockResolvedValue(updatedOrg);

            // Act
            const result = await controller.update(orgId, updateOrgDto);

            // Assert
            expect(service.update).toHaveBeenCalledWith(orgId, updateOrgDto);
            expect(result).toEqual(updatedOrg);
        });

        it('should handle partial updates', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            const updateOrgDto: UpdateOrgDto = {
                name: 'Only Name Updated',
            };
            const updatedOrg = createMockOrg({ _id: orgId, name: 'Only Name Updated' });
            mockOrgService.update.mockResolvedValue(updatedOrg);

            // Act
            const result = await controller.update(orgId, updateOrgDto);

            // Assert
            expect(service.update).toHaveBeenCalledWith(orgId, updateOrgDto);
            expect(result).toEqual(updatedOrg);
        });

        it('should handle update errors', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            const updateOrgDto: UpdateOrgDto = { name: 'Updated Name' };
            const error = new Error('Update failed');
            mockOrgService.update.mockRejectedValue(error);

            // Act & Assert
            await expect(controller.update(orgId, updateOrgDto)).rejects.toThrow('Update failed');
            expect(service.update).toHaveBeenCalledWith(orgId, updateOrgDto);
        });
    });

    describe('remove', () => 
    {
        it('should remove an organization', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            const removedOrg = createMockOrg({ _id: orgId });
            mockOrgService.remove.mockResolvedValue(removedOrg);

            // Act
            const result = await controller.remove(orgId);

            // Assert
            expect(service.remove).toHaveBeenCalledWith(orgId);
            expect(result).toEqual(removedOrg);
        });

        it('should handle removal errors', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            const error = new Error('Removal failed');
            mockOrgService.remove.mockRejectedValue(error);

            // Act & Assert
            await expect(controller.remove(orgId)).rejects.toThrow('Removal failed');
            expect(service.remove).toHaveBeenCalledWith(orgId);
        });
    });

    describe('addUserToOrg', () => 
    {
        it('should add a user to an organization', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            const addUserDto: AddUserToOrgDto = {
                userId: '507f1f77bcf86cd799439012',
                role: OrgRole.STAFF, // Changed from MEMBER to STAFF
            };
            const mockOrg = createMockOrg({
                _id: orgId,
                users: [
                    {
                        user: addUserDto.userId,
                        role: addUserDto.role,
                        joinedAt: new Date(),
                    },
                ],
            });
            mockOrgService.addUserToOrg.mockResolvedValue(mockOrg);

            // Act
            const result = await controller.addUserToOrg(orgId, addUserDto);

            // Assert
            expect(service.addUserToOrg).toHaveBeenCalledWith(orgId, addUserDto.userId, addUserDto.role);
            expect(result).toEqual(mockOrg);
        });

        it('should add a user with admin role', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            const addUserDto: AddUserToOrgDto = {
                userId: '507f1f77bcf86cd799439012',
                role: OrgRole.MANAGER, // Changed from ADMIN to MANAGER
            };
            const mockOrg = createMockOrg({ _id: orgId });
            mockOrgService.addUserToOrg.mockResolvedValue(mockOrg);

            // Act
            const result = await controller.addUserToOrg(orgId, addUserDto);

            // Assert
            expect(service.addUserToOrg).toHaveBeenCalledWith(orgId, addUserDto.userId, OrgRole.MANAGER); // Changed from ADMIN to MANAGER
            expect(result).toEqual(mockOrg);
        });

        it('should handle errors when adding user to organization', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            const addUserDto: AddUserToOrgDto = {
                userId: '507f1f77bcf86cd799439012',
                role: OrgRole.STAFF, // Changed from MEMBER to STAFF
            };
            const error = new Error('User already in organization');
            mockOrgService.addUserToOrg.mockRejectedValue(error);

            // Act & Assert
            await expect(controller.addUserToOrg(orgId, addUserDto)).rejects.toThrow('User already in organization');
            expect(service.addUserToOrg).toHaveBeenCalledWith(orgId, addUserDto.userId, addUserDto.role);
        });
    });

    describe('getUsersInOrg', () => 
    {
        it('should return all users in an organization', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            const mockUsers = [
                createMockUser({ _id: '507f1f77bcf86cd799439012' }),
                createMockUser({ _id: '507f1f77bcf86cd799439013' }),
            ];
            mockOrgService.getUsersInOrg.mockResolvedValue(mockUsers);

            // Act
            const result = await controller.getUsersInOrg(orgId);

            // Assert
            expect(service.getUsersInOrg).toHaveBeenCalledWith(orgId);
            expect(result).toEqual(mockUsers);
        });

        it('should return empty array for organization with no users', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            mockOrgService.getUsersInOrg.mockResolvedValue([]);

            // Act
            const result = await controller.getUsersInOrg(orgId);

            // Assert
            expect(service.getUsersInOrg).toHaveBeenCalledWith(orgId);
            expect(result).toEqual([]);
        });

        it('should handle errors when getting users', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            const error = new Error('Organization not found');
            mockOrgService.getUsersInOrg.mockRejectedValue(error);

            // Act & Assert
            await expect(controller.getUsersInOrg(orgId)).rejects.toThrow('Organization not found');
            expect(service.getUsersInOrg).toHaveBeenCalledWith(orgId);
        });
    });

    describe('updateUserRoleInOrg', () => 
    {
        it('should update user role in organization', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            const userId = '507f1f77bcf86cd799439012';
            const updateUserRoleDto: UpdateUserRoleInOrgDto = {
                role: OrgRole.MANAGER, // Changed from ADMIN to MANAGER
            };
            const mockOrg = createMockOrg({
                _id: orgId,
                users: [
                    {
                        user: userId,
                        role: OrgRole.MANAGER, // Changed from ADMIN to MANAGER
                        joinedAt: new Date(),
                    },
                ],
            });
            mockOrgService.updateUserRoleInOrg.mockResolvedValue(mockOrg);

            // Act
            const result = await controller.updateUserRoleInOrg(orgId, userId, updateUserRoleDto);

            // Assert
            expect(service.updateUserRoleInOrg).toHaveBeenCalledWith(orgId, userId, OrgRole.MANAGER); // Changed from ADMIN to MANAGER
            expect(result).toEqual(mockOrg);
        });

        it('should downgrade user from admin to member', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            const userId = '507f1f77bcf86cd799439012';
            const updateUserRoleDto: UpdateUserRoleInOrgDto = {
                role: OrgRole.STAFF, // Changed from MEMBER to STAFF
            };
            const mockOrg = createMockOrg({ _id: orgId });
            mockOrgService.updateUserRoleInOrg.mockResolvedValue(mockOrg);

            // Act
            const result = await controller.updateUserRoleInOrg(orgId, userId, updateUserRoleDto);

            // Assert
            expect(service.updateUserRoleInOrg).toHaveBeenCalledWith(orgId, userId, OrgRole.STAFF); // Changed from MEMBER to STAFF
            expect(result).toEqual(mockOrg);
        });

        it('should handle errors when updating user role', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            const userId = '507f1f77bcf86cd799439012';
            const updateUserRoleDto: UpdateUserRoleInOrgDto = {
                role: OrgRole.MANAGER, // Changed from ADMIN to MANAGER
            };
            const error = new Error('User not found in organization');
            mockOrgService.updateUserRoleInOrg.mockRejectedValue(error);

            // Act & Assert
            await expect(controller.updateUserRoleInOrg(orgId, userId, updateUserRoleDto)).rejects.toThrow('User not found in organization');
            expect(service.updateUserRoleInOrg).toHaveBeenCalledWith(orgId, userId, OrgRole.MANAGER); // Changed from ADMIN to MANAGER
        });
    });

    describe('removeUserFromOrg', () => 
    {
        it('should remove user from organization', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            const userId = '507f1f77bcf86cd799439012';
            const mockOrg = createMockOrg({
                _id: orgId,
                users: [], // User removed
            });
            mockOrgService.removeUserFromOrg.mockResolvedValue(mockOrg);

            // Act
            const result = await controller.removeUserFromOrg(orgId, userId);

            // Assert
            expect(service.removeUserFromOrg).toHaveBeenCalledWith(orgId, userId);
            expect(result).toEqual(mockOrg);
        });

        it('should handle errors when removing user from organization', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            const userId = '507f1f77bcf86cd799439012';
            const error = new Error('User not found in organization');
            mockOrgService.removeUserFromOrg.mockRejectedValue(error);

            // Act & Assert
            await expect(controller.removeUserFromOrg(orgId, userId)).rejects.toThrow('User not found in organization');
            expect(service.removeUserFromOrg).toHaveBeenCalledWith(orgId, userId);
        });

        it('should handle organization not found errors', async () => 
        {
            // Arrange
            const orgId = '507f1f77bcf86cd799439011';
            const userId = '507f1f77bcf86cd799439012';
            const error = new Error('Organization not found');
            mockOrgService.removeUserFromOrg.mockRejectedValue(error);

            // Act & Assert
            await expect(controller.removeUserFromOrg(orgId, userId)).rejects.toThrow('Organization not found');
            expect(service.removeUserFromOrg).toHaveBeenCalledWith(orgId, userId);
        });
    });
});
