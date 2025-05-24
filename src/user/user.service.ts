import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService
{
    constructor(@InjectModel(User.name) private readonly userModel: Model<User>) { }

    async create(createUserDto: CreateUserDto): Promise<User>
    {
        try 
        {
            // In a real app, hash the password before saving
            // For now, we'll store it as is, or make it optional if not provided during initial dev
            const newUser = new this.userModel(createUserDto);
            return await newUser.save();
        } 
        catch (error: any) 
        {
            // Handle MongoDB duplicate key error (E11000)
            if (error.code === 11000) 
            {
                throw new ConflictException('Email already exists');
            }
            
            // Handle MongoDB validation errors
            if (error.name === 'ValidationError') 
            {
                const messages = Object.values(error.errors).map((err: any) => err.message);
                throw new BadRequestException(`Validation failed: ${messages.join(', ')}`);
            }
            
            // Re-throw other errors
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
