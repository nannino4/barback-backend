import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService
{
    private readonly logger = new Logger(UserService.name);

    constructor(@InjectModel(User.name) private readonly userModel: Model<User>)
    {
        this.logger.debug('UserService initialized', 'UserService#constructor');
    }

    async create(user: CreateUserDto): Promise<User>
    {
        this.logger.debug(`Attempting to create user with email: ${user.email}`, 'UserService#create');
        const existingUser = await this.userModel.findOne({ email: user.email }).exec();
        if (existingUser)
        {
            this.logger.warn(`User with email "${user.email}" already exists`, 'UserService#create');
            throw new ConflictException(`User with email "${user.email}" already exists`);
        }
        const createdUser = new this.userModel(user);
        await createdUser.save();
        this.logger.debug(`User created successfully: ${createdUser.email}`, 'UserService#create');
        return createdUser;
    }

    async findAll(limit: number, offset: number): Promise<User[]>
    {
        this.logger.debug(`Fetching all users with limit: ${limit}, offset: ${offset}`, 'UserService#findAll');
        const users = await this.userModel
            .find()
            .skip(offset)
            .limit(limit)
            .exec();
        this.logger.debug(`Found ${users.length} users`, 'UserService#findAll');
        return users;
    }

    async findById(id: string): Promise<User>
    {
        this.logger.debug(`Attempting to find user by ID: ${id}`, 'UserService#findById');
        const user = await this.userModel.findById(id).exec();
        if (!user)
        {
            this.logger.warn(`User with ID "${id}" not found`, 'UserService#findById');
            throw new NotFoundException(`User with ID "${id}" not found`);
        }
        this.logger.debug(`User found: ${user.email} with ID: ${id}`, 'UserService#findById');
        return user;
    }

    async findByEmail(email: string): Promise<User | null>
    {
        this.logger.debug(`Attempting to find user by email: ${email}`, 'UserService#findByEmail');
        const user = await this.userModel.findOne({ email }).exec();
        if (!user)
        {
            this.logger.debug(`User with email "${email}" not found`, 'UserService#findByEmail');
            return null;
        }
        this.logger.debug(`User found: ${user.email}`, 'UserService#findByEmail');
        return user;
    }

    async findByGoogleId(googleId: string): Promise<User | null>
    {
        this.logger.debug(`Attempting to find user by Google ID: ${googleId}`, 'UserService#findByGoogleId');
        const user = await this.userModel.findOne({ googleId }).exec();
        if (!user)
        {
            this.logger.debug(`User with Google ID "${googleId}" not found`, 'UserService#findByGoogleId');
            return null;
        }
        this.logger.debug(`User found with Google ID: ${googleId}`, 'UserService#findByGoogleId');
        return user;
    }

    async updateProfile(id: string, updateData: Partial<Pick<User, 'firstName' | 'lastName' | 'phoneNumber'>>): Promise<User>
    {
        this.logger.debug(`Attempting to update profile for user ID: ${id}`, 'UserService#updateProfile');
        const user = await this.userModel.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).exec();

        if (!user)
        {
            this.logger.warn(`User with ID "${id}" not found for profile update`, 'UserService#updateProfile');
            throw new NotFoundException(`User with ID "${id}" not found`);
        }

        this.logger.debug(`Profile updated successfully for user: ${user.email}`, 'UserService#updateProfile');
        return user;
    }

    async updateRole(id: string, role: UserRole): Promise<User>
    {
        this.logger.debug(`Attempting to update role for user ID: ${id} to role: ${role}`, 'UserService#updateRole');
        const user = await this.userModel.findByIdAndUpdate(
            id,
            { $set: { role } },
            { new: true, runValidators: true }
        ).exec();

        if (!user)
        {
            this.logger.warn(`User with ID "${id}" not found for role update`, 'UserService#updateRole');
            throw new NotFoundException(`User with ID "${id}" not found`);
        }

        this.logger.debug(`Role updated successfully for user: ${user.email} to role: ${role}`, 'UserService#updateRole');
        return user;
    }

    async updateStatus(id: string, isActive: boolean): Promise<User>
    {
        this.logger.debug(`Attempting to update status for user ID: ${id} to active: ${isActive}`, 'UserService#updateStatus');
        const user = await this.userModel.findByIdAndUpdate(
            id,
            { $set: { isActive } },
            { new: true, runValidators: true }
        ).exec();

        if (!user)
        {
            this.logger.warn(`User with ID "${id}" not found for status update`, 'UserService#updateStatus');
            throw new NotFoundException(`User with ID "${id}" not found`);
        }

        this.logger.debug(`Status updated successfully for user: ${user.email} to active: ${isActive}`, 'UserService#updateStatus');
        return user;
    }

    async remove(id: string): Promise<any>
    {
        this.logger.debug(`Attempting to remove user with ID: ${id}`, 'UserService#remove');
        const result = await this.userModel.deleteOne({ _id: id }).exec();
        if (result.deletedCount === 0)
        {
            this.logger.warn(`User with ID "${id}" not found for removal`, 'UserService#remove');
            throw new NotFoundException(`User with ID "${id}" not found`);
        }
        this.logger.debug(`User with ID "${id}" successfully deleted`, 'UserService#remove');
        return { message: `User with ID "${id}" successfully deleted` };
    }
}
