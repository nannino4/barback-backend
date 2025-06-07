import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';
import { User, UserSchema, UserRole, AuthProvider } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserProfileDto } from './dto/in.update-user-profile.dto';
import { DatabaseTestHelper } from '../../test/utils/database.helper';
import * as bcrypt from 'bcrypt';

describe('UserService - Service Tests (Unit-style)', () => 
{
    let service: UserService;
    let connection: Connection;
    let module: TestingModule;

    const mockCreateUserDto: CreateUserDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
        hashedPassword: 'hashedPassword123',
        role: UserRole.USER,
        authProvider: AuthProvider.EMAIL,
    };

    const mockUpdateUserProfileDto: UpdateUserProfileDto = {
        firstName: 'Updated',
        lastName: 'Name',
        phoneNumber: '+9876543210',
    };

    beforeAll(async () => 
    {
        module = await Test.createTestingModule({
            imports: [
                DatabaseTestHelper.getMongooseTestModule(),
                MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
            ],
            providers: [UserService],
        }).compile();

        service = module.get<UserService>(UserService);
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

    describe('create', () => 
    {
        it('should successfully create a new user', async () => 
        {
            // Act
            const result = await service.create(mockCreateUserDto);

            // Assert
            expect(result).toBeDefined();
            expect(result.email).toBe(mockCreateUserDto.email);
            expect(result.firstName).toBe(mockCreateUserDto.firstName);
            expect(result.lastName).toBe(mockCreateUserDto.lastName);
            expect(result.phoneNumber).toBe(mockCreateUserDto.phoneNumber);
            expect(result.role).toBe(mockCreateUserDto.role);
            expect(result.authProvider).toBe(mockCreateUserDto.authProvider);
            expect(result.isActive).toBe(true);
        });

        it('should throw ConflictException when user already exists', async () => 
        {
            // Arrange
            await service.create(mockCreateUserDto);

            // Act & Assert  
            await expect(service.create(mockCreateUserDto)).rejects.toThrow(ConflictException);
        });

        it('should create user with default values', async () => 
        {
            // Arrange
            const minimalUserDto: CreateUserDto = {
                email: 'minimal@example.com',
                firstName: 'Min',
                lastName: 'User',
                authProvider: AuthProvider.EMAIL,
            };

            // Act
            const result = await service.create(minimalUserDto);

            // Assert
            expect(result.role).toBe(UserRole.USER);
            expect(result.isActive).toBe(true);
            expect(result.isEmailVerified).toBe(false);
        });
    });

    describe('findAll', () => 
    {
        beforeEach(async () => 
        {
            // Create test users
            await service.create({ ...mockCreateUserDto, email: 'user1@example.com' });
            await service.create({ ...mockCreateUserDto, email: 'user2@example.com' });
            await service.create({ ...mockCreateUserDto, email: 'user3@example.com' });
        });

        it('should return paginated users', async () => 
        {
            // Act
            const result = await service.findAll(2, 0);

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0].email).toBeDefined();
        });

        it('should respect pagination offset', async () => 
        {
            // Act
            const firstPage = await service.findAll(2, 0);
            const secondPage = await service.findAll(2, 2);

            // Assert
            expect(firstPage).toHaveLength(2);
            expect(secondPage).toHaveLength(1);
            expect(firstPage[0].id).not.toBe(secondPage[0].id);
        });

        it('should return empty array when no users exist', async () => 
        {
            // Arrange
            await DatabaseTestHelper.clearDatabase(connection);

            // Act
            const result = await service.findAll(10, 0);

            // Assert
            expect(result).toHaveLength(0);
        });
    });

    describe('findById', () => 
    {
        it('should return user when found', async () => 
        {
            // Arrange
            const createdUser = await service.create(mockCreateUserDto);

            // Act
            const result = await service.findById(createdUser.id);

            // Assert
            expect(result).toBeDefined();
            expect(result.id).toBe(createdUser.id);
            expect(result.email).toBe(createdUser.email);
        });

        it('should throw NotFoundException when user not found', async () => 
        {
            // Arrange
            const nonExistentId = '507f1f77bcf86cd799439011';

            // Act & Assert
            await expect(service.findById(nonExistentId)).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException for invalid ObjectId format', async () => 
        {
            // Arrange
            const invalidId = 'invalid-id';

            // Act & Assert
            await expect(service.findById(invalidId)).rejects.toThrow();
        });
    });

    describe('findByEmail', () => 
    {
        it('should return user when found by email', async () => 
        {
            // Arrange
            const createdUser = await service.create(mockCreateUserDto);

            // Act
            const result = await service.findByEmail(createdUser.email);

            // Assert
            expect(result).toBeDefined();
            expect(result).not.toBeNull();
            expect(result!.email).toBe(createdUser.email);
            expect(result!.id).toBe(createdUser.id);
        });

        it('should return null when user not found by email', async () => 
        {
            // Arrange
            const nonExistentEmail = 'nonexistent@example.com';

            // Act
            const result = await service.findByEmail(nonExistentEmail);

            // Assert
            expect(result).toBeNull();
        });

        it('should handle case-sensitive email search', async () => 
        {
            // Arrange
            await service.create(mockCreateUserDto);

            // Act
            const result = await service.findByEmail('TEST@EXAMPLE.COM');

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('updateProfile', () => 
    {
        it('should successfully update user profile', async () => 
        {
            // Arrange
            const createdUser = await service.create(mockCreateUserDto);

            // Act
            const result = await service.updateProfile(createdUser.id, mockUpdateUserProfileDto);

            // Assert
            expect(result).toBeDefined();
            expect(result.firstName).toBe(mockUpdateUserProfileDto.firstName);
            expect(result.lastName).toBe(mockUpdateUserProfileDto.lastName);
            expect(result.phoneNumber).toBe(mockUpdateUserProfileDto.phoneNumber);
            expect(result.email).toBe(createdUser.email); // Should remain unchanged
        });

        it('should throw NotFoundException when user not found for update', async () => 
        {
            // Arrange
            const nonExistentId = '507f1f77bcf86cd799439011';

            // Act & Assert
            await expect(service.updateProfile(nonExistentId, mockUpdateUserProfileDto)).rejects.toThrow(NotFoundException);
        });

        it('should update only provided fields', async () => 
        {
            // Arrange
            const createdUser = await service.create(mockCreateUserDto);
            const partialUpdate = { firstName: 'PartialUpdate' };

            // Act
            const result = await service.updateProfile(createdUser.id, partialUpdate);

            // Assert
            expect(result.firstName).toBe('PartialUpdate');
            expect(result.lastName).toBe(createdUser.lastName); // Should remain unchanged
            expect(result.phoneNumber).toBe(createdUser.phoneNumber); // Should remain unchanged
        });
    });

    describe('remove', () => 
    {
        it('should successfully remove user', async () => 
        {
            // Arrange
            const createdUser = await service.create(mockCreateUserDto);

            // Act
            await service.remove(createdUser.id);

            // Assert - verify user was actually deleted
            await expect(service.findById(createdUser.id)).rejects.toThrow('not found');
        });

        it('should throw NotFoundException when user not found for removal', async () => 
        {
            // Arrange
            const nonExistentId = '507f1f77bcf86cd799439011';

            // Act & Assert
            await expect(service.remove(nonExistentId)).rejects.toThrow(NotFoundException);
        });
    });

    describe('changePassword', () => 
    {
        it('should successfully change user password', async () => 
        {
            // Arrange
            const plainPassword = 'originalPassword123';
            const hashedPassword = await bcrypt.hash(plainPassword, 10);
            const userWithPassword = await service.create({
                ...mockCreateUserDto,
                hashedPassword,
            });
            const newPassword = 'newPassword456';

            // Act
            await service.changePassword(userWithPassword.id, plainPassword, newPassword);

            // Assert - verify password was actually changed
            const updatedUser = await service.findById(userWithPassword.id);
            const isNewPasswordValid = await bcrypt.compare(newPassword, updatedUser.hashedPassword!);
            expect(isNewPasswordValid).toBe(true);
        });

        it('should throw NotFoundException when user not found for password update', async () => 
        {
            // Arrange
            const nonExistentId = '507f1f77bcf86cd799439011';

            // Act & Assert
            await expect(service.changePassword(nonExistentId, 'oldPassword', 'newPassword')).rejects.toThrow(NotFoundException);
        });

        it('should throw UnauthorizedException for invalid old password', async () => 
        {
            // Arrange
            const plainPassword = 'originalPassword123';
            const hashedPassword = await bcrypt.hash(plainPassword, 10);
            const userWithPassword = await service.create({
                ...mockCreateUserDto,
                hashedPassword,
            });
            const wrongOldPassword = 'wrongPassword';
            const newPassword = 'newPassword456';

            // Act & Assert
            await expect(service.changePassword(userWithPassword.id, wrongOldPassword, newPassword)).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException when user has no password set', async () => 
        {
            // Arrange
            const userWithoutPassword = await service.create({
                ...mockCreateUserDto,
                hashedPassword: undefined,
            });

            // Act & Assert
            await expect(service.changePassword(userWithoutPassword.id, 'oldPassword', 'newPassword')).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('Edge Cases and Data Integrity', () => 
    {
        it('should maintain referential integrity across operations', async () => 
        {
            // Arrange
            const user1 = await service.create({ ...mockCreateUserDto, email: 'user1@example.com' });
            const user2 = await service.create({ ...mockCreateUserDto, email: 'user2@example.com' });

            // Act
            await service.updateProfile(user1.id, { firstName: 'Updated1' });
            await service.remove(user2.id);

            // Assert
            const updatedUser1 = await service.findById(user1.id);
            
            expect(updatedUser1.firstName).toBe('Updated1');
            expect(updatedUser1.isActive).toBe(true);
            
            // Verify user2 was removed (should throw NotFoundException)
            await expect(service.findById(user2.id)).rejects.toThrow(NotFoundException);
        });

        it('should handle concurrent user creation with same email', async () => 
        {
            // Arrange
            const sameEmailDto = { ...mockCreateUserDto };

            // Act & Assert
            const promises = [
                service.create(sameEmailDto),
                service.create(sameEmailDto),
            ];

            await expect(Promise.all(promises)).rejects.toThrow();
            
            // Verify only one user was created
            const users = await service.findAll(10, 0);
            const sameEmailUsers = users.filter(u => u.email === sameEmailDto.email);
            expect(sameEmailUsers).toHaveLength(1);
        });

        it('should handle large datasets efficiently', async () => 
        {
            // Arrange
            const userPromises = [];
            for (let i = 0; i < 50; i++) 
            {
                userPromises.push(service.create({
                    ...mockCreateUserDto,
                    email: `user${i}@example.com`,
                }));
            }
            await Promise.all(userPromises);

            // Act
            const startTime = Date.now();
            const users = await service.findAll(20, 10);
            const endTime = Date.now();

            // Assert
            expect(users).toHaveLength(20);
            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
        });
    });
});
