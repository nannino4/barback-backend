import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { OrgService } from './org.service';
import { Org } from './schemas/org.schema';
import { UserOrg, OrgRole } from './schemas/user-org.schema';
import { User } from '../user/schemas/user.schema';
import { CreateOrgDto } from './dto/create-org.dto';
import { createMockUser, createMockOrg } from '../__tests__/test-utils';

describe('OrgService', () =>
{
    let service: OrgService;
    let orgModel: any;
    let userOrgModel: any;
    let userModel: any;

    beforeEach(async () =>
    {
        const mockOrg = createMockOrg();
        const mockUserOrg = {
            _id: new Types.ObjectId(),
            userId: new Types.ObjectId(),
            orgId: new Types.ObjectId(),
            role: OrgRole.OWNER,
        };

        orgModel = {
            new: jest.fn().mockResolvedValue(mockOrg),
            constructor: jest.fn().mockResolvedValue(mockOrg),
            find: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            deleteOne: jest.fn(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            exec: jest.fn(),
            save: jest.fn().mockResolvedValue(mockOrg),
        };

        userOrgModel = {
            new: jest.fn().mockResolvedValue(mockUserOrg),
            constructor: jest.fn().mockResolvedValue(mockUserOrg),
            find: jest.fn(),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            deleteOne: jest.fn(),
            deleteMany: jest.fn(),
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn(),
            save: jest.fn().mockResolvedValue(mockUserOrg),
        };

        userModel = {
            findById: jest.fn(),
            exec: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrgService,
                {
                    provide: getModelToken(Org.name),
                    useValue: orgModel,
                },
                {
                    provide: getModelToken(UserOrg.name),
                    useValue: userOrgModel,
                },
                {
                    provide: getModelToken(User.name),
                    useValue: userModel,
                },
            ],
        }).compile();

        service = module.get<OrgService>(OrgService);
    });

    afterEach(() =>
    {
        jest.clearAllMocks();
    });

    describe('create', () =>
    {
        it('should create a new organization and add owner to UserOrg', async () =>
        {
            // Arrange
            const ownerId = new Types.ObjectId().toString();
            const createOrgDto: CreateOrgDto = {
                name: 'Test Bar',
                ownerId,
            };

            const mockUser = createMockUser({ _id: new Types.ObjectId(ownerId) });
            const mockOrg = createMockOrg({ ...createOrgDto, ownerId: new Types.ObjectId(ownerId) });

            userModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockUser),
            });

            orgModel.save = jest.fn().mockResolvedValue(mockOrg);
            orgModel.constructor = jest.fn().mockImplementation(() => ({
                save: orgModel.save,
            }));

            userOrgModel.save = jest.fn().mockResolvedValue({});
            userOrgModel.constructor = jest.fn().mockImplementation(() => ({
                save: userOrgModel.save,
            }));

            // Act
            const result = await service.create(createOrgDto);

            // Assert
            expect(userModel.findById).toHaveBeenCalledWith(ownerId);
            expect(orgModel.constructor).toHaveBeenCalledWith(createOrgDto);
            expect(orgModel.save).toHaveBeenCalled();
            expect(userOrgModel.constructor).toHaveBeenCalledWith({
                orgId: mockOrg._id,
                userId: mockUser._id,
                role: OrgRole.OWNER,
            });
            expect(result).toEqual(mockOrg);
        });

        it('should throw BadRequestException when owner not found', async () =>
        {
            // Arrange
            const ownerId = new Types.ObjectId().toString();
            const createOrgDto: CreateOrgDto = {
                name: 'Test Bar',
                ownerId,
            };

            userModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            // Act & Assert
            await expect(service.create(createOrgDto)).rejects.toThrow(
                new BadRequestException(`Owner user with ID "${ownerId}" not found.`),
            );
        });
    });

    describe('findOne', () =>
    {
        it('should return organization when found', async () =>
        {
            // Arrange
            const orgId = new Types.ObjectId().toString();
            const mockOrg = createMockOrg({ _id: new Types.ObjectId(orgId) });

            orgModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockOrg),
            });

            // Act
            const result = await service.findOne(orgId);

            // Assert
            expect(orgModel.findById).toHaveBeenCalledWith(orgId);
            expect(result).toEqual(mockOrg);
        });

        it('should throw BadRequestException for invalid ID format', async () =>
        {
            // Arrange
            const invalidId = 'invalid-id';

            // Act & Assert
            await expect(service.findOne(invalidId)).rejects.toThrow(
                new BadRequestException(`Invalid Org ID format: "${invalidId}"`),
            );
        });

        it('should throw NotFoundException when organization not found', async () =>
        {
            // Arrange
            const orgId = new Types.ObjectId().toString();

            orgModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            // Act & Assert
            await expect(service.findOne(orgId)).rejects.toThrow(
                new NotFoundException(`Org with ID "${orgId}" not found`),
            );
        });
    });

    describe('addUserToOrg', () =>
    {
        it('should add user to organization with specified role', async () =>
        {
            // Arrange
            const orgId = new Types.ObjectId().toString();
            const userId = new Types.ObjectId().toString();
            const role = OrgRole.MANAGER;

            const mockOrg = createMockOrg({ _id: new Types.ObjectId(orgId) });
            const mockUser = createMockUser({ _id: new Types.ObjectId(userId) });
            const mockUserOrg = {
                orgId: new Types.ObjectId(orgId),
                userId: new Types.ObjectId(userId),
                role,
            };

            orgModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockOrg),
            });

            userModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockUser),
            });

            userOrgModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null), // No existing relationship
            });

            userOrgModel.save = jest.fn().mockResolvedValue(mockUserOrg);
            userOrgModel.constructor = jest.fn().mockImplementation(() => ({
                save: userOrgModel.save,
            }));

            // Act
            const result = await service.addUserToOrg(orgId, userId, role);

            // Assert
            expect(orgModel.findById).toHaveBeenCalledWith(orgId);
            expect(userModel.findById).toHaveBeenCalledWith(userId);
            expect(userOrgModel.findOne).toHaveBeenCalledWith({
                orgId: new Types.ObjectId(orgId),
                userId: new Types.ObjectId(userId),
            });
            expect(userOrgModel.constructor).toHaveBeenCalledWith({
                orgId: new Types.ObjectId(orgId),
                userId: new Types.ObjectId(userId),
                role,
            });
            expect(result).toEqual(mockUserOrg);
        });

        it('should throw ConflictException when user already in organization', async () =>
        {
            // Arrange
            const orgId = new Types.ObjectId().toString();
            const userId = new Types.ObjectId().toString();
            const role = OrgRole.STAFF;

            const mockOrg = createMockOrg({ _id: new Types.ObjectId(orgId) });
            const mockUser = createMockUser({ _id: new Types.ObjectId(userId) });
            const existingUserOrg = {
                orgId: new Types.ObjectId(orgId),
                userId: new Types.ObjectId(userId),
                role: OrgRole.MANAGER,
            };

            orgModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockOrg),
            });

            userModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockUser),
            });

            userOrgModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(existingUserOrg),
            });

            // Act & Assert
            await expect(service.addUserToOrg(orgId, userId, role)).rejects.toThrow(
                new ConflictException(`User "${userId}" is already a member of org "${orgId}".`),
            );
        });

        it('should throw NotFoundException when organization not found', async () =>
        {
            // Arrange
            const orgId = new Types.ObjectId().toString();
            const userId = new Types.ObjectId().toString();
            const role = OrgRole.STAFF;

            orgModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            // Act & Assert
            await expect(service.addUserToOrg(orgId, userId, role)).rejects.toThrow(
                new NotFoundException(`Org with ID "${orgId}" not found.`),
            );
        });

        it('should throw NotFoundException when user not found', async () =>
        {
            // Arrange
            const orgId = new Types.ObjectId().toString();
            const userId = new Types.ObjectId().toString();
            const role = OrgRole.STAFF;

            const mockOrg = createMockOrg({ _id: new Types.ObjectId(orgId) });

            orgModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockOrg),
            });

            userModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            // Act & Assert
            await expect(service.addUserToOrg(orgId, userId, role)).rejects.toThrow(
                new NotFoundException(`User with ID "${userId}" not found.`),
            );
        });
    });

    describe('updateUserRoleInOrg', () =>
    {
        it('should update user role in organization', async () =>
        {
            // Arrange
            const orgId = new Types.ObjectId().toString();
            const userId = new Types.ObjectId().toString();
            const newRole = OrgRole.MANAGER;

            const updatedUserOrg = {
                orgId: new Types.ObjectId(orgId),
                userId: new Types.ObjectId(userId),
                role: newRole,
            };

            userOrgModel.findOneAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(updatedUserOrg),
            });

            // Act
            const result = await service.updateUserRoleInOrg(orgId, userId, newRole);

            // Assert
            expect(userOrgModel.findOneAndUpdate).toHaveBeenCalledWith(
                {
                    orgId: new Types.ObjectId(orgId),
                    userId: new Types.ObjectId(userId),
                },
                { role: newRole },
                { new: true },
            );
            expect(result).toEqual(updatedUserOrg);
        });

        it('should throw NotFoundException when user not found in organization', async () =>
        {
            // Arrange
            const orgId = new Types.ObjectId().toString();
            const userId = new Types.ObjectId().toString();
            const newRole = OrgRole.MANAGER;

            userOrgModel.findOneAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            // Act & Assert
            await expect(service.updateUserRoleInOrg(orgId, userId, newRole)).rejects.toThrow(
                new NotFoundException(`User "${userId}" not found in org "${orgId}".`),
            );
        });
    });

    describe('removeUserFromOrg', () =>
    {
        it('should remove user from organization', async () =>
        {
            // Arrange
            const orgId = new Types.ObjectId().toString();
            const userId = new Types.ObjectId().toString();

            userOrgModel.deleteOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
            });

            // Act
            const result = await service.removeUserFromOrg(orgId, userId);

            // Assert
            expect(userOrgModel.deleteOne).toHaveBeenCalledWith({
                orgId: new Types.ObjectId(orgId),
                userId: new Types.ObjectId(userId),
            });
            expect(result).toEqual({
                message: `User "${userId}" removed from org "${orgId}".`,
            });
        });

        it('should throw NotFoundException when user not found in organization', async () =>
        {
            // Arrange
            const orgId = new Types.ObjectId().toString();
            const userId = new Types.ObjectId().toString();

            userOrgModel.deleteOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
            });

            // Act & Assert
            await expect(service.removeUserFromOrg(orgId, userId)).rejects.toThrow(
                new NotFoundException(`User "${userId}" not found in org "${orgId}".`),
            );
        });
    });

    describe('remove', () =>
    {
        it('should remove organization and all user associations', async () =>
        {
            // Arrange
            const orgId = new Types.ObjectId().toString();

            userOrgModel.deleteMany.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ deletedCount: 3 }),
            });

            orgModel.deleteOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
            });

            // Act
            const result = await service.remove(orgId);

            // Assert
            expect(userOrgModel.deleteMany).toHaveBeenCalledWith({
                orgId: new Types.ObjectId(orgId),
            });
            expect(orgModel.deleteOne).toHaveBeenCalledWith({ _id: orgId });
            expect(result).toEqual({
                message: `Org with ID "${orgId}" and its user associations successfully deleted`,
            });
        });

        it('should throw NotFoundException when organization not found', async () =>
        {
            // Arrange
            const orgId = new Types.ObjectId().toString();

            userOrgModel.deleteMany.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
            });

            orgModel.deleteOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
            });

            // Act & Assert
            await expect(service.remove(orgId)).rejects.toThrow(
                new NotFoundException(`Org with ID "${orgId}" not found or already deleted`),
            );
        });
    });
});
