import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, AuthProvider } from './schemas/user.schema'; // Added AuthProvider import
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService
{
    constructor(@InjectModel(User.name) private readonly userModel: Model<User>) { }

    async create(createUserDto: CreateUserDto): Promise<User>
    {
        try 
        {
            const { authProvider, password, googleId } = createUserDto; // Changed hashedPassword to password
            let hashedPassword: string | null = null;

            if (authProvider === AuthProvider.GOOGLE) 
            {
                if (!googleId) 
                {
                    throw new BadRequestException('Google ID is required for Google authentication.');
                }
                if (password) // Check if password was provided for Google auth
                {
                    throw new BadRequestException('Password should not be provided for Google authentication.');
                }
                // Ensure email is unique for googleId as well, or handle linking accounts
                const existingUserWithGoogleId = await this.userModel.findOne({ googleId }).exec();
                if (existingUserWithGoogleId) 
                {
                    throw new ConflictException('User with this Google ID already exists.');
                }
                createUserDto.isEmailVerified = true; // Assume Google verifies email
                // finalHashedPassword remains null for Google Auth
            }
            else // Defaults to AuthProvider.EMAIL or if authProvider is explicitly EMAIL
            {
                if (!password) // Check if password is provided for email auth
                {
                    throw new BadRequestException('Password is required for email authentication.');
                }
                if (googleId) 
                {
                    throw new BadRequestException('Google ID should not be provided for email authentication.');
                }
                const saltOrRounds = 10;
                hashedPassword = await bcrypt.hash(password, saltOrRounds);
                createUserDto.isEmailVerified = createUserDto.isEmailVerified !== undefined ? createUserDto.isEmailVerified : false;
            }

            // Remove password from the DTO before spreading, as we use finalHashedPassword
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password: dtoPassword, ...restOfDto } = createUserDto;

            const userToSave = {
                ...restOfDto,
                hashedPassword: hashedPassword, // Save the processed password here
                authProvider: authProvider || AuthProvider.EMAIL, // Default to email if not provided
            };

            const newUser = new this.userModel(userToSave);
            return await newUser.save();
        } 
        catch (error: any) 
        {
            if (error.code === 11000) 
            {
                // More specific error message based on which field caused the duplicate error
                if (error.keyPattern?.email) 
                {
                    throw new ConflictException('Email already exists.');
                }
                if (error.keyPattern?.googleId) 
                {
                    throw new ConflictException('Google ID already exists. It must be unique.');
                }
                throw new ConflictException('A unique field constraint was violated.');
            }
            
            if (error.name === 'ValidationError') 
            {
                const messages = Object.values(error.errors).map((err: any) => err.message);
                throw new BadRequestException(`Validation failed: ${messages.join(', ')}`);
            }
            
            throw error;
        }
    }

    async findAll(limit: number, offset: number): Promise<User[]>
    {
        return this.userModel.find().skip(offset).limit(limit).exec();
    }

    async findOne(id: string): Promise<User>
    {
        const user = await this.userModel.findById(id).exec();
        if (!user)
        {
            throw new NotFoundException(`User with ID "${id}" not found`);
        }
        return user;
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<User>
    {
        const existingUser = await this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true }).exec();
        if (!existingUser)
        {
            throw new NotFoundException(`User with ID "${id}" not found`);
        }
        return existingUser;
    }

    async remove(id: string): Promise<any>
    {
        const result = await this.userModel.deleteOne({ _id: id }).exec();
        if (result.deletedCount === 0)
        {
            throw new NotFoundException(`User with ID "${id}" not found`);
        }
        return { message: `User with ID "${id}" successfully deleted` };
    }

    // Helper method for authentication (to be used later)
    async findByEmail(email: string): Promise<User | null>
    {
        return this.userModel.findOne({ email }).exec();
    }
}
