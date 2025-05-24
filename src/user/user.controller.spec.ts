import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { createMockUser } from '../__tests__/test-utils';

describe('UserController', () =>
{
    let controller: UserController;
    let service: UserService;

    const mockUserService = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
    };

    beforeEach(async () =>
    {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [
                {
                    provide: UserService,
                    useValue: mockUserService,
                },
            ],
        }).compile();

        controller = module.get<UserController>(UserController);
        service = module.get<UserService>(UserService);
    });

    afterEach(() =>
    {
        jest.clearAllMocks();
    });

    describe('create', () =>
    {
        it('should create a new user', async () =>
        {
            // Arrange
            const createUserDto: CreateUserDto = {
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                hashedPassword: 'hashedPassword123',
            };
            const mockUser = createMockUser(createUserDto);
            mockUserService.create.mockResolvedValue(mockUser);

            // Act
            const result = await controller.create(createUserDto);

            // Assert
            expect(service.create).toHaveBeenCalledWith(createUserDto);
            expect(result).toEqual(mockUser);
        });
    });

    describe('findAll', () =>
    {
        it('should return paginated users with default parameters', async () =>
        {
            // Arrange
            const mockUsers = [createMockUser(), createMockUser({ email: 'test2@example.com' })];
            mockUserService.findAll.mockResolvedValue(mockUsers);

            // Act
            const result = await controller.findAll();

            // Assert
            expect(service.findAll).toHaveBeenCalledWith(10, 0);
            expect(result).toEqual(mockUsers);
        });

        it('should return paginated users with custom parameters', async () =>
        {
            // Arrange
            const limit = 5;
            const offset = 20;
            const mockUsers = [createMockUser()];
            mockUserService.findAll.mockResolvedValue(mockUsers);

            // Act
            const result = await controller.findAll(limit, offset);

            // Assert
            expect(service.findAll).toHaveBeenCalledWith(limit, offset);
            expect(result).toEqual(mockUsers);
        });
    });

    describe('findOne', () =>
    {
        it('should return a user by id', async () =>
        {
            // Arrange
            const userId = '507f1f77bcf86cd799439011';
            const mockUser = createMockUser();
            mockUserService.findOne.mockResolvedValue(mockUser);

            // Act
            const result = await controller.findOne(userId);

            // Assert
            expect(service.findOne).toHaveBeenCalledWith(userId);
            expect(result).toEqual(mockUser);
        });
    });

    describe('update', () =>
    {
        it('should update a user', async () =>
        {
            // Arrange
            const userId = '507f1f77bcf86cd799439011';
            const updateUserDto: UpdateUserDto = {
                firstName: 'Jane',
                lastName: 'Smith',
            };
            const updatedUser = createMockUser({ ...updateUserDto });
            mockUserService.update.mockResolvedValue(updatedUser);

            // Act
            const result = await controller.update(userId, updateUserDto);

            // Assert
            expect(service.update).toHaveBeenCalledWith(userId, updateUserDto);
            expect(result).toEqual(updatedUser);
        });
    });

    describe('remove', () =>
    {
        it('should remove a user', async () =>
        {
            // Arrange
            const userId = '507f1f77bcf86cd799439011';
            const deleteResult = { message: `User with ID "${userId}" successfully deleted` };
            mockUserService.remove.mockResolvedValue(deleteResult);

            // Act
            const result = await controller.remove(userId);

            // Assert
            expect(service.remove).toHaveBeenCalledWith(userId);
            expect(result).toEqual(deleteResult);
        });
    });
});
