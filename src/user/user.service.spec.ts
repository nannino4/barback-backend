import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { createMockUser } from '../__tests__/test-utils';

describe('UserService', () =>
{
    let service: UserService;
    let model: Model<User>;
    let mockUserModel: any;

    beforeEach(async () =>
    {
        const mockUser = createMockUser();

        mockUserModel = {
            new: jest.fn().mockResolvedValue(mockUser),
            constructor: jest.fn().mockResolvedValue(mockUser),
            find: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            findOne: jest.fn(),
            deleteOne: jest.fn(),
            exec: jest.fn(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            save: jest.fn().mockResolvedValue(mockUser),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: getModelToken(User.name),
                    useValue: mockUserModel,
                },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
        model = module.get<Model<User>>(getModelToken(User.name));
    });

    afterEach(() =>
    {
        jest.clearAllMocks();
    });

    describe('create', () =>
    {
        it('should create and return a new user', async () =>
        {
            // Arrange
            const createUserDto: CreateUserDto = {
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                hashedPassword: 'hashedPassword123',
            };

            const mockUser = createMockUser(createUserDto);
            mockUserModel.save = jest.fn().mockResolvedValue(mockUser);
            mockUserModel.constructor = jest.fn().mockImplementation(() => ({
                save: mockUserModel.save,
            }));

            // Act
            const result = await service.create(createUserDto);

            // Assert
            expect(mockUserModel.constructor).toHaveBeenCalledWith(createUserDto);
            expect(mockUserModel.save).toHaveBeenCalled();
            expect(result).toEqual(mockUser);
        });
    });

    describe('findAll', () =>
    {
        it('should return paginated users', async () =>
        {
            // Arrange
            const mockUsers = [createMockUser(), createMockUser({ email: 'test2@example.com' })];
            mockUserModel.find.mockReturnValue({
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockUsers),
            });

            // Act
            const result = await service.findAll(10, 0);

            // Assert
            expect(mockUserModel.find).toHaveBeenCalled();
            expect(result).toEqual(mockUsers);
        });

        it('should apply pagination correctly', async () =>
        {
            // Arrange
            const limit = 5;
            const offset = 10;
            const mockUsers = [createMockUser()];

            const chainMock = {
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockUsers),
            };
            mockUserModel.find.mockReturnValue(chainMock);

            // Act
            await service.findAll(limit, offset);

            // Assert
            expect(chainMock.skip).toHaveBeenCalledWith(offset);
            expect(chainMock.limit).toHaveBeenCalledWith(limit);
        });
    });

    describe('findOne', () =>
    {
        it('should return a user when found', async () =>
        {
            // Arrange
            const userId = new Types.ObjectId().toString();
            const mockUser = createMockUser({ _id: new Types.ObjectId(userId) });
            
            mockUserModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockUser),
            });

            // Act
            const result = await service.findOne(userId);

            // Assert
            expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
            expect(result).toEqual(mockUser);
        });

        it('should throw NotFoundException when user not found', async () =>
        {
            // Arrange
            const userId = new Types.ObjectId().toString();
            mockUserModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            // Act & Assert
            await expect(service.findOne(userId)).rejects.toThrow(
                new NotFoundException(`User with ID "${userId}" not found`),
            );
        });
    });

    describe('update', () =>
    {
        it('should update and return the user', async () =>
        {
            // Arrange
            const userId = new Types.ObjectId().toString();
            const updateUserDto: UpdateUserDto = {
                firstName: 'Jane',
                lastName: 'Smith',
            };
            const updatedUser = createMockUser({ ...updateUserDto, _id: new Types.ObjectId(userId) });

            mockUserModel.findByIdAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(updatedUser),
            });

            // Act
            const result = await service.update(userId, updateUserDto);

            // Assert
            expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
                userId,
                updateUserDto,
                { new: true },
            );
            expect(result).toEqual(updatedUser);
        });

        it('should throw NotFoundException when user not found', async () =>
        {
            // Arrange
            const userId = new Types.ObjectId().toString();
            const updateUserDto: UpdateUserDto = { firstName: 'Jane' };

            mockUserModel.findByIdAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            // Act & Assert
            await expect(service.update(userId, updateUserDto)).rejects.toThrow(
                new NotFoundException(`User with ID "${userId}" not found`),
            );
        });
    });

    describe('remove', () =>
    {
        it('should delete the user and return success message', async () =>
        {
            // Arrange
            const userId = new Types.ObjectId().toString();
            mockUserModel.deleteOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
            });

            // Act
            const result = await service.remove(userId);

            // Assert
            expect(mockUserModel.deleteOne).toHaveBeenCalledWith({ _id: userId });
            expect(result).toEqual({
                message: `User with ID "${userId}" successfully deleted`,
            });
        });

        it('should throw NotFoundException when user not found', async () =>
        {
            // Arrange
            const userId = new Types.ObjectId().toString();
            mockUserModel.deleteOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
            });

            // Act & Assert
            await expect(service.remove(userId)).rejects.toThrow(
                new NotFoundException(`User with ID "${userId}" not found`),
            );
        });
    });

    describe('findByEmail', () =>
    {
        it('should return a user when found by email', async () =>
        {
            // Arrange
            const email = 'test@example.com';
            const mockUser = createMockUser({ email });

            mockUserModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockUser),
            });

            // Act
            const result = await service.findByEmail(email);

            // Assert
            expect(mockUserModel.findOne).toHaveBeenCalledWith({ email });
            expect(result).toEqual(mockUser);
        });

        it('should return null when user not found by email', async () =>
        {
            // Arrange
            const email = 'nonexistent@example.com';
            mockUserModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            // Act
            const result = await service.findByEmail(email);

            // Assert
            expect(mockUserModel.findOne).toHaveBeenCalledWith({ email });
            expect(result).toBeNull();
        });
    });
});
