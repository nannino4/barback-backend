import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Org } from './schemas/org.schema';
import { UserOrgRelation } from './schemas/user-org-relation.schema';
import { UpdateOrganizationDto } from './dto/in.update-org.dto';
import { CreateOrgDto } from './dto/in.create-org.dto';
import { CustomLogger } from '../common/logger/custom.logger';

@Injectable()
export class OrgService 
{
    constructor(
        @InjectModel(Org.name) private readonly orgModel: Model<Org>,
        @InjectModel(UserOrgRelation.name) private readonly relationshipModel: Model<UserOrgRelation>,
        private readonly logger: CustomLogger,
    ) {}

    async create(createData: CreateOrgDto, ownerId: Types.ObjectId, subscriptionId: Types.ObjectId): Promise<Org>
    {
        this.logger.debug(`Creating organization: ${createData.name} for owner: ${ownerId}`, 'OrgService#create');
        const org = new this.orgModel({
            name: createData.name,
            ownerId: ownerId,
            subscriptionId: subscriptionId,
            settings: createData.settings || { defaultCurrency: 'EUR' },
        });
        
        await org.save();
        this.logger.debug(`Organization created successfully: ${org.name} with ID: ${org._id}`, 'OrgService#create');
        return org;
    }

    async findById(orgId: Types.ObjectId): Promise<Org | null> 
    {
        this.logger.debug(`Finding organization by ID: ${orgId}`, 'OrgService#findById');
        const org = await this.orgModel.findById(orgId).exec();
        if (!org)
        {
            this.logger.warn(`Organization not found for ID: ${orgId}`, 'OrgService#findById');
            return null;
        }
        this.logger.debug(`Found organization: ${org.name} for ID: ${orgId}`, 'OrgService#findById');
        return org;
    }

    async update(orgId: Types.ObjectId, updateData: UpdateOrganizationDto): Promise<Org>
    {
        this.logger.debug(`Attempting to update organization ID: ${orgId}`, 'OrgService#update');
        const org = await this.orgModel.findByIdAndUpdate(
            orgId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).exec();
        if (!org)
        {
            this.logger.warn(`Organization with ID "${orgId}" not found for update`, 'OrgService#update');
            throw new NotFoundException(`Organization with ID "${orgId}" not found`);
        }
        this.logger.debug(`Organization updated successfully: ${org.name}`, 'OrgService#update');
        return org;
    }
}
