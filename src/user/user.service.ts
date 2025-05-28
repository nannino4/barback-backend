import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, AuthProvider } from './schemas/user.schema'; // Added AuthProvider import
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService
{
    private readonly logger = new Logger(UserService.name);

    constructor(@InjectModel(User.name) private readonly userModel: Model<User>)
    {
        this.logger.log('UserService initialized', 'UserService#constructor');
    }

    async create(createUserDto: CreateUserDto): Promise<User>
    {
        this.logger.log(`Attempting to create user: ${createUserDto.email}`, 'UserService#create');
        try 
        {
            const { authProvider, password, googleId, email } = createUserDto;
            let hashedPassword: string | null = null;

            this.logger.debug(`Provider: ${authProvider}, Email: ${email}`, 'UserService#create');

            if (authProvider === AuthProvider.GOOGLE) 
            {
                this.logger.debug(`Processing Google user: ${email}`, 'UserService#create');
                if (!googleId) 
                {
                    this.logger.warn(`Google ID missing for Google user: ${email}`, 'UserService#create');
                    throw new BadRequestException('Google ID is required for Google authentication.');
                }
                if (password) 
                {
                    this.logger.warn(`Password provided for Google user: ${email}`, 'UserService#create');
                    throw new BadRequestException('Password should not be provided for Google authentication.');
                }
                const existingUserWithGoogleId = await this.userModel.findOne({ googleId }).exec();
                if (existingUserWithGoogleId) 
                {
                    this.logger.warn(`Google ID ${googleId} already exists for user: ${email}`, 'UserService#create');
                    throw new ConflictException('User with this Google ID already exists.');
                }
                createUserDto.isEmailVerified = true; 
                this.logger.debug(`Set isEmailVerified to true for Google user: ${email}`, 'UserService#create');
            }
            else 
            {
                this.logger.debug(`Processing Email user: ${email}`, 'UserService#create');
                if (!password) 
                {
                    this.logger.warn(`Password missing for Email user: ${email}`, 'UserService#create');
                    throw new BadRequestException('Password is required for email authentication.');
                }
                if (googleId) 
                {
                    this.logger.warn(`Google ID provided for Email user: ${email}`, 'UserService#create');
                    throw new BadRequestException('Google ID should not be provided for email authentication.');
                }
                const saltOrRounds = 10;
                hashedPassword = await bcrypt.hash(password, saltOrRounds);
                this.logger.debug(`Password hashed for Email user: ${email}`, 'UserService#create');
                createUserDto.isEmailVerified = createUserDto.isEmailVerified !== undefined ? createUserDto.isEmailVerified : false;
                this.logger.debug(`isEmailVerified set to ${createUserDto.isEmailVerified} for Email user: ${email}`, 'UserService#create');
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password: dtoPassword, ...restOfDto } = createUserDto;

            const userToSave = {
                ...restOfDto,
                hashedPassword: hashedPassword, 
                authProvider: authProvider || AuthProvider.EMAIL, 
            };
            this.logger.debug(`User data prepared for saving: ${email}`, 'UserService#create');

            const newUser = new this.userModel(userToSave);
            const savedUser = await newUser.save();
            this.logger.log(`User created successfully: ${savedUser.email} with ID: ${savedUser._id}`, 'UserService#create');
            return savedUser;
        } 
        catch (error: any) 
        {
            this.logger.error(`Error creating user ${createUserDto.email}: ${error.message}`, error.stack, 'UserService#create');
            if (error.code === 11000) 
            {
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
        this.logger.log(`Fetching all users with limit: ${limit}, offset: ${offset}`, 'UserService#findAll');
        const users = await this.userModel.find().skip(offset).limit(limit).exec();
        this.logger.log(`Found ${users.length} users`, 'UserService#findAll');
        return users;
    }

    async findById(id: string): Promise<User>
    {
        this.logger.log(`Attempting to find user by ID: ${id}`, 'UserService#findById');
        const user = await this.userModel.findById(id).exec();
        if (!user)
        {
            this.logger.warn(`User with ID "${id}" not found`, 'UserService#findById');
            throw new NotFoundException(`User with ID "${id}" not found`);
        }
        this.logger.log(`User found: ${user.email} with ID: ${id}`, 'UserService#findById');
        return user;
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<User>
    {
        this.logger.log(`Attempting to update user with ID: ${id}`, 'UserService#update');
        this.logger.debug(`Update DTO: ${JSON.stringify(updateUserDto)}`, 'UserService#update'); 
        const existingUser = await this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true }).exec();
        if (!existingUser)
        {
            this.logger.warn(`User with ID "${id}" not found for update`, 'UserService#update');
            throw new NotFoundException(`User with ID "${id}" not found`);
        }
        this.logger.log(`User with ID "${id}" updated successfully`, 'UserService#update');
        return existingUser;
    }

    async remove(id: string): Promise<any>
    {
        this.logger.log(`Attempting to remove user with ID: ${id}`, 'UserService#remove');
        const result = await this.userModel.deleteOne({ _id: id }).exec();
        if (result.deletedCount === 0)
        {
            this.logger.warn(`User with ID "${id}" not found for removal`, 'UserService#remove');
            throw new NotFoundException(`User with ID "${id}" not found`);
        }
        this.logger.log(`User with ID "${id}" successfully deleted`, 'UserService#remove');
        return { message: `User with ID "${id}" successfully deleted` };
    }

    async findByEmail(email: string): Promise<User | null>
    {
        this.logger.log(`Attempting to find user by email: ${email}`, 'UserService#findByEmail');
        const user = await this.userModel.findOne({ email }).exec();
        if (!user)
        {
            this.logger.log(`User with email "${email}" not found`, 'UserService#findByEmail');
            return null;
        }
        this.logger.log(`User found: ${user.email}`, 'UserService#findByEmail');
        return user;
    }
}
