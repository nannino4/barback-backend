import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserRole, AuthProvider } from './schemas/user.schema';
import { CreateUserDto } from './dto/in.create-user.dto';
import { UpdateUserProfileDto } from './dto/in.update-user-profile.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { 
    EmailAlreadyExistsException,
    InvalidEmailVerificationTokenException,
    InvalidPasswordResetTokenException,
    EmailAlreadyVerifiedException,
    PasswordChangeNotAllowedException,
    UserNotFoundByIdException,
    PasswordConcurrentChangeException,
} from './exceptions/user.exceptions';
import { DatabaseOperationException } from '../common/exceptions/database.exceptions';
import { PasswordHashingException } from '../auth/exceptions/auth.exceptions';
import { CustomLogger } from '../common/logger/custom.logger';

@Injectable()
export class UserService
{
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
        private readonly logger: CustomLogger,
    )
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
            throw new EmailAlreadyExistsException(user.email);
        }
        
        // Database operation with error handling
        try 
        {
            const createdUser = new this.userModel(user);
            await createdUser.save();
            this.logger.debug(`User created successfully: ${createdUser.email}`, 'UserService#create');
            return createdUser;
        }
        catch (error) 
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Database operation failed for user creation: ${user.email}`, errorStack, 'UserService#create');
            throw new DatabaseOperationException('user creation', errorMessage);
        }
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

    async findById(id: Types.ObjectId): Promise<User>
    {
        this.logger.debug(`Attempting to find user by ID: ${id}`, 'UserService#findById');
        
        let user: User | null;
        try 
        {
            user = await this.userModel.findById(id).exec();
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Database error while finding user by ID: ${id}`, errorStack, 'UserService#findById');
            throw new DatabaseOperationException('user lookup by ID', errorMessage);
        }
        
        if (!user)
        {
            this.logger.warn(`User with ID "${id}" not found`, 'UserService#findById');
            throw new UserNotFoundByIdException(id.toString());
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

    async updateProfile(id: Types.ObjectId, updateData: UpdateUserProfileDto): Promise<User>
    {
        this.logger.debug(`Attempting to update profile for user ID: ${id}`, 'UserService#updateProfile');
        
        try 
        {
            const user = await this.userModel.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true, runValidators: true }
            ).exec();
            
            if (!user)
            {
                this.logger.warn(`User with ID "${id}" not found for profile update`, 'UserService#updateProfile');
                throw new UserNotFoundByIdException(id.toString());
            }
            
            this.logger.debug(`Profile updated successfully for user: ${user.email}`, 'UserService#updateProfile');
            return user;
        }
        catch (error)
        {
            if (error instanceof UserNotFoundByIdException)
            {
                throw error;
            }
            
            // Handle MongoDB validation errors
            if (error instanceof Error && error.name === 'ValidationError')
            {
                this.logger.warn(`Profile validation failed for user ID: ${id} - ${error.message}`, 'UserService#updateProfile');
                throw new DatabaseOperationException('profile update validation', error.message);
            }
            
            // Handle other database errors
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Database operation failed for profile update: ${id}`, errorStack, 'UserService#updateProfile');
            throw new DatabaseOperationException('profile update', errorMessage);
        }
    }

    async updateRole(id: Types.ObjectId, role: UserRole): Promise<User>
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
            throw new UserNotFoundByIdException(id.toString());
        }

        this.logger.debug(`Role updated successfully for user: ${user.email} to role: ${role}`, 'UserService#updateRole');
        return user;
    }

    async updateStatus(id: Types.ObjectId, isActive: boolean): Promise<User>
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
            throw new UserNotFoundByIdException(id.toString());
        }

        this.logger.debug(`Status updated successfully for user: ${user.email} to active: ${isActive}`, 'UserService#updateStatus');
        return user;
    }

    async remove(id: Types.ObjectId): Promise<void>
    {
        this.logger.debug(`Attempting to remove user with ID: ${id}`, 'UserService#remove');
        
        
        // TODO: Add business logic validations here when org/subscription modules are implemented
        // Example validations:
        // - Check if user is the sole owner of any organizations
        // - Check if user has active subscriptions
        // - Check if user has pending payments
        // For now, we'll proceed with deletion
        
        try 
        {
            const result = await this.userModel.deleteOne({ _id: id }).exec();
            if (result.deletedCount === 0)
            {
                this.logger.warn(`No user was deleted for ID: ${id}`, 'UserService#remove');
                throw new UserNotFoundByIdException(id.toString());
            }
        }
        catch (error)
        {
            if (error instanceof UserNotFoundByIdException)
            {
                throw error;
            }
            
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Database error while deleting user: ${id}`, errorStack, 'UserService#remove');
            throw new DatabaseOperationException('user deletion', errorMessage);
        }
        
        this.logger.debug(`User with ID "${id}" successfully deleted`, 'UserService#remove');
        return;
    }

    async changePassword(userId: Types.ObjectId, currentPassword: string, newPassword: string): Promise<void>
    {
        this.logger.debug(`Attempting to change password for user ID: ${userId}`, 'UserService#changePassword');
        
        // Use findById to get user and handle not found error
        const user = await this.findById(userId);
        
        if (user.authProvider !== AuthProvider.EMAIL)
        {
            this.logger.warn(`User ${user.email} is not using EMAIL authentication`, 'UserService#changePassword');
            throw new PasswordChangeNotAllowedException(user.authProvider);
        }
        
        if (!user.hashedPassword || !(await bcrypt.compare(currentPassword, user.hashedPassword)))
        {
            this.logger.warn(`Invalid current password for user: ${user.email}`, 'UserService#changePassword');
            throw new UnauthorizedException('Current password is incorrect');
        }
        
        let hashedNewPassword: string;
        try 
        {
            const saltOrRounds = 10;
            hashedNewPassword = await bcrypt.hash(newPassword, saltOrRounds);
        }
        catch (error)
        {
            this.logger.error('Password hashing failed during password change', error instanceof Error ? error.stack : undefined, 'UserService#changePassword');
            throw new PasswordHashingException();
        }
        
        try 
        {
            // Atomic update with condition to prevent race condition
            // Only update if the current password still matches (hasn't been changed by another request)
            const result = await this.userModel.findOneAndUpdate(
                { 
                    _id: userId,
                    hashedPassword: user.hashedPassword,  // Condition: current password must match
                },
                { $set: { hashedPassword: hashedNewPassword } },
                { new: true, runValidators: true }
            ).exec();
            
            if (!result)
            {
                // Password was changed by another request or user was deleted
                this.logger.warn(`Password update failed - password changed concurrently for user: ${user.email}`, 'UserService#changePassword');
                throw new PasswordConcurrentChangeException();
            }
        }
        catch (error)
        {
            if (error instanceof PasswordConcurrentChangeException)
            {
                throw error;
            }
            
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Database error while updating password for user: ${user.email}`, errorStack, 'UserService#changePassword');
            throw new DatabaseOperationException('password update', errorMessage);
        }
        
        this.logger.debug(`Password changed successfully for user: ${user.email}`, 'UserService#changePassword');
        return;
    }

    async updateStripeCustomerId(userId: Types.ObjectId, stripeCustomerId: string): Promise<User>
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
            throw new UserNotFoundByIdException(userId.toString());
        }
        this.logger.debug(`Stripe customer ID updated successfully for user: ${user.email}`, 'UserService#updateStripeCustomerId');
        return user;
    }

    async findByStripeCustomerId(stripeCustomerId: string): Promise<User | null>
    {
        this.logger.debug(`Finding user by Stripe customer ID: ${stripeCustomerId}`, 'UserService#findByStripeCustomerId');
        
        try 
        {
            const user = await this.userModel.findOne({ stripeCustomerId }).exec();
            
            if (!user) 
            {
                this.logger.warn(`User not found with Stripe customer ID: ${stripeCustomerId}`, 'UserService#findByStripeCustomerId');
                return null;
            }
            
            this.logger.debug(`User found with Stripe customer ID: ${stripeCustomerId}`, 'UserService#findByStripeCustomerId');
            return user;
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(
                `Database error while finding user by Stripe customer ID: ${stripeCustomerId}`,
                error instanceof Error ? error.stack : undefined,
                'UserService#findByStripeCustomerId'
            );
            throw new DatabaseOperationException('user lookup by Stripe customer ID', errorMessage);
        }
    }

    async generateEmailVerificationToken(userId: Types.ObjectId): Promise<string>
    {
        this.logger.debug(`Generating email verification token for user ID: ${userId}`, 'UserService#generateEmailVerificationToken');
        
        try 
        {
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

            await this.userModel.findByIdAndUpdate(
                userId,
                { 
                    $set: { 
                        emailVerificationToken: token,
                        emailVerificationExpires: expiresAt,
                    },
                },
                { new: true, runValidators: true }
            ).exec();

            this.logger.debug(`Email verification token generated for user ID: ${userId}`, 'UserService#generateEmailVerificationToken');
            return token;
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Failed to generate email verification token for user ID: ${userId}`, error instanceof Error ? error.stack : undefined, 'UserService#generateEmailVerificationToken');
            throw new DatabaseOperationException('email verification token generation', errorMessage);
        }
    }

    async verifyEmail(token: string): Promise<User>
    {
        this.logger.debug('Attempting to verify email with token', 'UserService#verifyEmail');
        
        let user: User | null;
        try 
        {
            user = await this.userModel.findOne({
                emailVerificationToken: token,
                emailVerificationExpires: { $gt: new Date() },
            }).exec();
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error('Database error while finding user by verification token', error instanceof Error ? error.stack : undefined, 'UserService#verifyEmail');
            throw new DatabaseOperationException('email verification lookup', errorMessage);
        }

        if (!user)
        {
            this.logger.warn('Invalid or expired email verification token', 'UserService#verifyEmail');
            throw new InvalidEmailVerificationTokenException();
        }

        // Check if email is already verified (business logic validation)
        if (user.isEmailVerified)
        {
            this.logger.warn(`Email already verified for user: ${user.email}`, 'UserService#verifyEmail');
            throw new EmailAlreadyVerifiedException(user.email);
        }

        let updatedUser: User | null;
        try 
        {
            updatedUser = await this.userModel.findByIdAndUpdate(
                user.id,
                { 
                    $set: { 
                        isEmailVerified: true,
                    },
                    $unset: { 
                        emailVerificationToken: 1,
                        emailVerificationExpires: 1,
                    },
                },
                { new: true, runValidators: true }
            ).exec();
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Database error while updating user verification status for user ID: ${user.id}`, error instanceof Error ? error.stack : undefined, 'UserService#verifyEmail');
            throw new DatabaseOperationException('email verification update', errorMessage);
        }

        if (!updatedUser)
        {
            this.logger.error(`Failed to update user after email verification for user ID: ${user.id}`, 'UserService#verifyEmail');
            throw new UserNotFoundByIdException(user.id.toString());
        }

        this.logger.debug(`Email verified successfully for user: ${updatedUser.email}`, 'UserService#verifyEmail');
        return updatedUser;
    }

    async findByEmailVerificationToken(token: string): Promise<User | null>
    {
        this.logger.debug('Attempting to find user by email verification token', 'UserService#findByEmailVerificationToken');
        const user = await this.userModel.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: new Date() },
        }).exec();

        if (!user)
        {
            this.logger.debug('User not found with valid email verification token', 'UserService#findByEmailVerificationToken');
            return null;
        }

        this.logger.debug(`User found with email verification token: ${user.email}`, 'UserService#findByEmailVerificationToken');
        return user;
    }

    async generatePasswordResetToken(email: string): Promise<string | null>
    {
        this.logger.debug(`Generating password reset token for email: ${email}`, 'UserService#generatePasswordResetToken');
        
        let user: User | null;
        try 
        {
            user = await this.userModel.findOne({ email }).exec();
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Database error while finding user for password reset: ${email}`, error instanceof Error ? error.stack : undefined, 'UserService#generatePasswordResetToken');
            throw new DatabaseOperationException('password reset user lookup', errorMessage);
        }
        
        if (!user)
        {
            this.logger.debug(`User not found for password reset request: ${email}`, 'UserService#generatePasswordResetToken');
            return null; // Don't reveal if email exists
        }

        if (user.authProvider !== AuthProvider.EMAIL)
        {
            this.logger.debug(`User ${email} is not using EMAIL authentication for password reset`, 'UserService#generatePasswordResetToken');
            return null; // Don't reveal auth provider
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour from now

        try 
        {
            await this.userModel.findByIdAndUpdate(
                user.id,
                { 
                    $set: { 
                        passwordResetToken: token,
                        passwordResetExpires: expiresAt,
                    },
                },
                { new: true, runValidators: true }
            ).exec();
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Database error while updating password reset token for user: ${user.email}`, error instanceof Error ? error.stack : undefined, 'UserService#generatePasswordResetToken');
            throw new DatabaseOperationException('password reset token update', errorMessage);
        }

        this.logger.debug(`Password reset token generated for user: ${user.email}`, 'UserService#generatePasswordResetToken');
        return token;
    }

    async resetPassword(token: string, newPassword: string): Promise<User>
    {
        this.logger.debug('Attempting to reset password with token', 'UserService#resetPassword');
        
        let user: User | null;
        try 
        {
            user = await this.userModel.findOne({
                passwordResetToken: token,
                passwordResetExpires: { $gt: new Date() },
            }).exec();
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error('Database error while finding user by password reset token', error instanceof Error ? error.stack : undefined, 'UserService#resetPassword');
            throw new DatabaseOperationException('password reset token lookup', errorMessage);
        }

        if (!user)
        {
            this.logger.warn('Invalid or expired password reset token', 'UserService#resetPassword');
            throw new InvalidPasswordResetTokenException();
        }

        let hashedPassword: string;
        try 
        {
            const saltOrRounds = 10;
            hashedPassword = await bcrypt.hash(newPassword, saltOrRounds);
        }
        catch (error)
        {
            this.logger.error('Password hashing failed during reset', error instanceof Error ? error.stack : undefined, 'UserService#resetPassword');
            throw new PasswordHashingException();
        }

        let updatedUser: User | null;
        try 
        {
            updatedUser = await this.userModel.findByIdAndUpdate(
                user.id,
                { 
                    $set: { 
                        hashedPassword,
                    },
                    $unset: { 
                        passwordResetToken: 1,
                        passwordResetExpires: 1,
                    },
                },
                { new: true, runValidators: true }
            ).exec();
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Database error while updating password for user ID: ${user.id}`, error instanceof Error ? error.stack : undefined, 'UserService#resetPassword');
            throw new DatabaseOperationException('password reset update', errorMessage);
        }

        if (!updatedUser)
        {
            this.logger.error(`Failed to update user after password reset for user ID: ${user.id}`, 'UserService#resetPassword');
            throw new UserNotFoundByIdException(user.id.toString());
        }

        this.logger.debug(`Password reset successfully for user: ${updatedUser.email}`, 'UserService#resetPassword');
        return updatedUser;
    }

    async findByPasswordResetToken(token: string): Promise<User | null>
    {
        this.logger.debug('Attempting to find user by password reset token', 'UserService#findByPasswordResetToken');
        
        let user: User | null;
        try 
        {
            user = await this.userModel.findOne({
                passwordResetToken: token,
                passwordResetExpires: { $gt: new Date() },
            }).exec();
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error('Database error while finding user by password reset token', error instanceof Error ? error.stack : undefined, 'UserService#findByPasswordResetToken');
            throw new DatabaseOperationException('password reset token lookup', errorMessage);
        }

        if (!user)
        {
            this.logger.debug('User not found with valid password reset token', 'UserService#findByPasswordResetToken');
            return null;
        }

        this.logger.debug(`User found with password reset token: ${user.email}`, 'UserService#findByPasswordResetToken');
        return user;
    }

    async linkGoogleAccount(user: User, googleId: string, googleProfilePicture?: string): Promise<User>
    {
        this.logger.debug(`Linking Google account to user: ${user.email}`, 'UserService#linkGoogleAccount');
        
        const updateData: any = {
            googleId: googleId,
            isEmailVerified: true, // Google accounts are always email verified
        };

        // Only update profile picture if Google has one and user doesn't have one
        if (googleProfilePicture && !user.profilePictureUrl) 
        {
            updateData.profilePictureUrl = googleProfilePicture;
        }

        const updatedUser = await this.userModel.findByIdAndUpdate(
            user._id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).exec();

        if (!updatedUser) 
        {
            this.logger.warn(`User with ID "${user.id}" not found for Google account linking`, 'UserService#linkGoogleAccount');
            throw new UserNotFoundByIdException(user.id.toString());
        }

        this.logger.debug(`Google account linked successfully for user: ${updatedUser.email}`, 'UserService#linkGoogleAccount');
        return updatedUser;
    }
}
