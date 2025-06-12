import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Org } from './schemas/org.schema';
import { UserOrgRelation } from './schemas/user-org-relation.schema';
import { UpdateOrganizationDto } from './dto/in.update-org.dto';

@Injectable()
export class OrgService 
{
    private readonly logger = new Logger(OrgService.name);

    constructor(
        @InjectModel(Org.name) private readonly orgModel: Model<Org>,
        @InjectModel(UserOrgRelation.name) private readonly relationshipModel: Model<UserOrgRelation>,
    ) {}

    async findById(orgId: string): Promise<Org | null> 
    {
        this.logger.debug(`Finding organization by ID: ${orgId}`, 'OrgService#findById');
        const org = await this.orgModel.findById(new Types.ObjectId(orgId)).exec();
        if (!org)
        {
            this.logger.warn(`Organization not found for ID: ${orgId}`, 'OrgService#findById');
            return null;
        }
        this.logger.debug(`Found organization: ${org.name} for ID: ${orgId}`, 'OrgService#findById');
        return org;
    }

    async update(orgId: string, updateData: UpdateOrganizationDto): Promise<Org>
    {
        this.logger.debug(`Attempting to update organization ID: ${orgId}`, 'OrgService#update');
        const org = await this.orgModel.findByIdAndUpdate(
            new Types.ObjectId(orgId),
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
