import { Injectable, NotFoundException, Logger, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole, AuthProvider } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserProfileDto } from './dto/in.update-user-profile.dto';
import * as bcrypt from 'bcrypt';

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

    async updateProfile(id: string, updateData: UpdateUserProfileDto): Promise<User>
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

    async remove(id: string): Promise<void>
    {
        this.logger.debug(`Attempting to remove user with ID: ${id}`, 'UserService#remove');
        const result = await this.userModel.deleteOne({ _id: id }).exec();
        if (result.deletedCount === 0)
        {
            this.logger.warn(`User with ID "${id}" not found for removal`, 'UserService#remove');
            throw new NotFoundException(`User with ID "${id}" not found`);
        }
        this.logger.debug(`User with ID "${id}" successfully deleted`, 'UserService#remove');
        return ;
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>
    {
        this.logger.debug(`Attempting to change password for user ID: ${userId}`, 'UserService#changePassword');
        const user = await this.userModel.findById(userId).exec();
        if (!user)
        {
            this.logger.warn(`User with ID "${userId}" not found for password change`, 'UserService#changePassword');
            throw new NotFoundException(`User with ID "${userId}" not found`);
        }
        if (user.authProvider !== AuthProvider.EMAIL)
        {
            this.logger.warn(`User ${user.email} is not using EMAIL authentication`, 'UserService#changePassword');
            throw new UnauthorizedException('Password change is only available for email-authenticated users');
        }
        if (!user.hashedPassword || !(await bcrypt.compare(currentPassword, user.hashedPassword)))
        {
            this.logger.warn(`Invalid current password for user: ${user.email}`, 'UserService#changePassword');
            throw new UnauthorizedException('Current password is incorrect');
        }
        const saltOrRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltOrRounds);
        await this.userModel.findByIdAndUpdate(
            userId,
            { $set: { hashedPassword: hashedNewPassword } },
            { new: true, runValidators: true }
        ).exec();
        this.logger.debug(`Password changed successfully for user: ${user.email}`, 'UserService#changePassword');
        return;
    }

    async updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User>
    {
        this.logger.debug(`Updating Stripe customer ID for user: ${userId}`, 'UserService#updateStripeCustomerId');
        const user = await this.userModel.findByIdAndUpdate(
            userId,
            { $set: { stripeCustomerId } },
            { new: true, runValidators: true }
        ).exec();
        if (!user)
        {
            this.logger.warn(`User with ID "${userId}" not found for Stripe customer ID update`, 'UserService#updateStripeCustomerId');
            throw new NotFoundException(`User with ID "${userId}" not found`);
        }
        this.logger.debug(`Stripe customer ID updated successfully for user: ${user.email}`, 'UserService#updateStripeCustomerId');
        return user;
    }
}
