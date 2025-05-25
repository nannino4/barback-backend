import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Org } from './schemas/org.schema';
import { UserOrg, OrgRole } from './schemas/user-org.schema';
import { User } from '../user/schemas/user.schema';
import { Subscription } from '../subscription/schemas/subscription.schema'; // Added Subscription import
import { CreateOrgDto } from './dto/create-org.dto';
import { UpdateOrgDto } from './dto/update-org.dto';

@Injectable()
export class OrgService
{
    constructor(
        @InjectModel(Org.name) private readonly orgModel: Model<Org>,
        @InjectModel(UserOrg.name) private readonly userOrgModel: Model<UserOrg>,
        @InjectModel(User.name) private readonly userModel: Model<User>,
        @InjectModel(Subscription.name) private readonly subscriptionModel: Model<Subscription>, // Added SubscriptionModel
    ) { }

    async create(createOrgDto: CreateOrgDto): Promise<Org>
    {
        try 
        {
            // Validate ownerId exists
            const owner = await this.userModel.findById(createOrgDto.ownerId).exec();
            if (!owner)
            {
                throw new BadRequestException(`Owner user with ID "${createOrgDto.ownerId}" not found.`);
            }

            // Validate subscriptionId exists
            const subscription = await this.subscriptionModel.findById(createOrgDto.subscriptionId).exec();
            if (!subscription)
            {
                throw new BadRequestException(`Subscription with ID "${createOrgDto.subscriptionId}" not found.`);
            }

            // Check if subscription is already linked to another organization
            const existingOrgWithSubscription = await this.orgModel.findOne({ subscriptionId: new Types.ObjectId(createOrgDto.subscriptionId) }).exec(); // Ensure ObjectId comparison
            if (existingOrgWithSubscription)
            {
                throw new ConflictException(`Subscription with ID "${createOrgDto.subscriptionId}" is already linked to organization "${existingOrgWithSubscription.name}".`);
            }

            // Create a new object for newOrg, excluding address and fiscalData explicitly if they were part of createOrgDto
            const { name, ownerId, subscriptionId, settings } = createOrgDto;
            const orgDataToSave = {
                name,
                ownerId: new Types.ObjectId(ownerId),
                subscriptionId: new Types.ObjectId(subscriptionId),
                settings, // settings can be undefined if not provided, which is fine
            };

            const newOrg = new this.orgModel(orgDataToSave);
            const savedOrg = await newOrg.save();

            // Automatically add the owner to the UserOrg collection
            await this.addUserToOrg((savedOrg._id as Types.ObjectId).toString(), (owner._id as Types.ObjectId).toString(), OrgRole.OWNER);

            return savedOrg;
        } 
        catch (error: any) 
        {
            // Handle MongoDB validation errors
            if (error.name === 'ValidationError') 
            {
                const messages = Object.values(error.errors).map((err: any) => err.message);
                throw new BadRequestException(`Validation failed: ${messages.join(', ')}`);
            }
            
            // Re-throw other errors (including our own BadRequestException)
            throw error;
        }
    }

    async findAll(limit: number, offset: number): Promise<Org[]>
    {
        return this.orgModel.find().skip(offset).limit(limit).exec();
    }

    async findOne(id: string): Promise<Org>
    {
        if (!Types.ObjectId.isValid(id))
        {
            throw new BadRequestException(`Invalid Org ID format: "${id}"`);
        }
        const org = await this.orgModel.findById(id).exec();
        if (!org)
        {
            throw new NotFoundException(`Org with ID "${id}" not found`);
        }
        return org;
    }

    async update(id: string, updateOrgDto: UpdateOrgDto): Promise<Org>
    {
        if (!Types.ObjectId.isValid(id))
        {
            throw new BadRequestException(`Invalid Org ID format: "${id}"`);
        }
        const existingOrg = await this.orgModel.findByIdAndUpdate(id, updateOrgDto, { new: true }).exec();
        if (!existingOrg)
        {
            throw new NotFoundException(`Org with ID "${id}" not found`);
        }
        return existingOrg;
    }

    async remove(id: string): Promise<any>
    {
        if (!Types.ObjectId.isValid(id))
        {
            throw new BadRequestException(`Invalid Org ID format: "${id}"`);
        }
        // First, remove all user associations for this org
        await this.userOrgModel.deleteMany({ orgId: new Types.ObjectId(id) }).exec();

        // Then, delete the org itself
        const result = await this.orgModel.deleteOne({ _id: id }).exec();
        if (result.deletedCount === 0)
        {
            throw new NotFoundException(`Org with ID "${id}" not found or already deleted`);
        }
        return { message: `Org with ID "${id}" and its user associations successfully deleted` };
    }

    // --- User Management in Org ---

    async addUserToOrg(orgId: string, userId: string, role: OrgRole): Promise<UserOrg>
    {
        if (!Types.ObjectId.isValid(orgId) || !Types.ObjectId.isValid(userId))
        {
            throw new BadRequestException('Invalid Org or User ID format');
        }

        // Check if org exists
        const org = await this.orgModel.findById(orgId).exec();
        if (!org)
        {
            throw new NotFoundException(`Org with ID "${orgId}" not found.`);
        }

        // Check if user exists
        const user = await this.userModel.findById(userId).exec();
        if (!user)
        {
            throw new NotFoundException(`User with ID "${userId}" not found.`);
        }

        // Check if user is already in the org
        const existingLink = await this.userOrgModel.findOne({ orgId: new Types.ObjectId(orgId), userId: new Types.ObjectId(userId) }).exec();
        if (existingLink)
        {
            throw new ConflictException(`User "${userId}" is already a member of org "${orgId}".`);
        }

        const userOrgLink = new this.userOrgModel({
            orgId: new Types.ObjectId(orgId),
            userId: new Types.ObjectId(userId),
            role,
        });
        return userOrgLink.save();
    }

    async getUsersInOrg(orgId: string): Promise<UserOrg[]>
    {
        if (!Types.ObjectId.isValid(orgId))
        {
            throw new BadRequestException(`Invalid Org ID format: "${orgId}"`);
        }
        return this.userOrgModel.find({ orgId: new Types.ObjectId(orgId) }).populate('userId', 'firstName lastName email role').exec();
    }

    async updateUserRoleInOrg(orgId: string, userId: string, role: OrgRole): Promise<UserOrg>
    {
        if (!Types.ObjectId.isValid(orgId) || !Types.ObjectId.isValid(userId))
        {
            throw new BadRequestException('Invalid Org or User ID format');
        }
        const updatedLink = await this.userOrgModel.findOneAndUpdate(
            { orgId: new Types.ObjectId(orgId), userId: new Types.ObjectId(userId) },
            { role },
            { new: true },
        ).exec();

        if (!updatedLink)
        {
            throw new NotFoundException(`User "${userId}" not found in org "${orgId}".`);
        }
        return updatedLink;
    }

    async removeUserFromOrg(orgId: string, userId: string): Promise<any>
    {
        if (!Types.ObjectId.isValid(orgId) || !Types.ObjectId.isValid(userId))
        {
            throw new BadRequestException('Invalid Org or User ID format');
        }
        const result = await this.userOrgModel.deleteOne({ orgId: new Types.ObjectId(orgId), userId: new Types.ObjectId(userId) }).exec();
        if (result.deletedCount === 0)
        {
            throw new NotFoundException(`User "${userId}" not found in org "${orgId}".`);
        }
        return { message: `User "${userId}" removed from org "${orgId}".` };
    }

    async findOrgsByUserId(userId: string): Promise<UserOrg[]>
    {
        if (!Types.ObjectId.isValid(userId))
        {
            throw new BadRequestException(`Invalid User ID format: "${userId}"`);
        }
        return this.userOrgModel.find({ userId: new Types.ObjectId(userId) }).populate('orgId').exec();
    }
}
