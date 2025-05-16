import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Organization } from './schemas/organization.schema';
import { UserOrganization, OrganizationRole } from './schemas/user-organization.schema';
import { User } from '../user/schemas/user.schema'; // Adjust path as needed
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationService
{
    constructor(
        @InjectModel(Organization.name) private readonly organizationModel: Model<Organization>,
        @InjectModel(UserOrganization.name) private readonly userOrganizationModel: Model<UserOrganization>,
        @InjectModel(User.name) private readonly userModel: Model<User>, // To validate user existence
    ) { }

    async create(createOrganizationDto: CreateOrganizationDto): Promise<Organization>
    {
        // Validate ownerId exists
        const owner = await this.userModel.findById(createOrganizationDto.ownerId).exec();
        if (!owner)
        {
            throw new BadRequestException(`Owner user with ID "${createOrganizationDto.ownerId}" not found.`);
        }

        const newOrganization = new this.organizationModel(createOrganizationDto);
        const savedOrg = await newOrganization.save();

        // Automatically add the owner to the UserOrganization collection
        await this.addUserToOrganization((savedOrg._id as Types.ObjectId).toString(), (owner._id as Types.ObjectId).toString(), OrganizationRole.OWNER);

        return savedOrg;
    }

    async findAll(limit: number, offset: number): Promise<Organization[]>
    {
        return this.organizationModel.find().skip(offset).limit(limit).exec();
    }

    async findOne(id: string): Promise<Organization>
    {
        if (!Types.ObjectId.isValid(id))
        {
            throw new BadRequestException(`Invalid Organization ID format: "${id}"`);
        }
        const organization = await this.organizationModel.findById(id).exec();
        if (!organization)
        {
            throw new NotFoundException(`Organization with ID "${id}" not found`);
        }
        return organization;
    }

    async update(id: string, updateOrganizationDto: UpdateOrganizationDto): Promise<Organization>
    {
        if (!Types.ObjectId.isValid(id))
        {
            throw new BadRequestException(`Invalid Organization ID format: "${id}"`);
        }
        const existingOrganization = await this.organizationModel.findByIdAndUpdate(id, updateOrganizationDto, { new: true }).exec();
        if (!existingOrganization)
        {
            throw new NotFoundException(`Organization with ID "${id}" not found`);
        }
        return existingOrganization;
    }

    async remove(id: string): Promise<any>
    {
        if (!Types.ObjectId.isValid(id))
        {
            throw new BadRequestException(`Invalid Organization ID format: "${id}"`);
        }
        // First, remove all user associations for this organization
        await this.userOrganizationModel.deleteMany({ organizationId: new Types.ObjectId(id) }).exec();

        // Then, delete the organization itself
        const result = await this.organizationModel.deleteOne({ _id: id }).exec();
        if (result.deletedCount === 0)
        {
            throw new NotFoundException(`Organization with ID "${id}" not found or already deleted`);
        }
        return { message: `Organization with ID "${id}" and its user associations successfully deleted` };
    }

    // --- User Management in Organization ---

    async addUserToOrganization(orgId: string, userId: string, role: OrganizationRole): Promise<UserOrganization>
    {
        if (!Types.ObjectId.isValid(orgId) || !Types.ObjectId.isValid(userId))
        {
            throw new BadRequestException('Invalid Organization or User ID format');
        }

        // Check if organization exists
        const organization = await this.organizationModel.findById(orgId).exec();
        if (!organization)
        {
            throw new NotFoundException(`Organization with ID "${orgId}" not found.`);
        }

        // Check if user exists
        const user = await this.userModel.findById(userId).exec();
        if (!user)
        {
            throw new NotFoundException(`User with ID "${userId}" not found.`);
        }

        // Check if user is already in the organization
        const existingLink = await this.userOrganizationModel.findOne({ organizationId: new Types.ObjectId(orgId), userId: new Types.ObjectId(userId) }).exec();
        if (existingLink)
        {
            throw new ConflictException(`User "${userId}" is already a member of organization "${orgId}".`);
        }

        const userOrgLink = new this.userOrganizationModel({
            organizationId: new Types.ObjectId(orgId),
            userId: new Types.ObjectId(userId),
            role,
        });
        return userOrgLink.save();
    }

    async getUsersInOrganization(orgId: string): Promise<UserOrganization[]>
    {
        if (!Types.ObjectId.isValid(orgId))
        {
            throw new BadRequestException(`Invalid Organization ID format: "${orgId}"`);
        }
        return this.userOrganizationModel.find({ organizationId: new Types.ObjectId(orgId) }).populate('userId', 'firstName lastName email role').exec();
    }

    async updateUserRoleInOrganization(orgId: string, userId: string, role: OrganizationRole): Promise<UserOrganization>
    {
        if (!Types.ObjectId.isValid(orgId) || !Types.ObjectId.isValid(userId))
        {
            throw new BadRequestException('Invalid Organization or User ID format');
        }
        const updatedLink = await this.userOrganizationModel.findOneAndUpdate(
            { organizationId: new Types.ObjectId(orgId), userId: new Types.ObjectId(userId) },
            { role },
            { new: true },
        ).exec();

        if (!updatedLink)
        {
            throw new NotFoundException(`User "${userId}" not found in organization "${orgId}".`);
        }
        return updatedLink;
    }

    async removeUserFromOrganization(orgId: string, userId: string): Promise<any>
    {
        if (!Types.ObjectId.isValid(orgId) || !Types.ObjectId.isValid(userId))
        {
            throw new BadRequestException('Invalid Organization or User ID format');
        }
        const result = await this.userOrganizationModel.deleteOne({ organizationId: new Types.ObjectId(orgId), userId: new Types.ObjectId(userId) }).exec();
        if (result.deletedCount === 0)
        {
            throw new NotFoundException(`User "${userId}" not found in organization "${orgId}".`);
        }
        return { message: `User "${userId}" removed from organization "${orgId}".` };
    }

    async findOrganizationsByUserId(userId: string): Promise<UserOrganization[]>
    {
        if (!Types.ObjectId.isValid(userId))
        {
            throw new BadRequestException(`Invalid User ID format: "${userId}"`);
        }
        return this.userOrganizationModel.find({ userId: new Types.ObjectId(userId) }).populate('organizationId').exec();
    }
}
