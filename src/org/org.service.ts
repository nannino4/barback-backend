import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Org } from './schemas/org.schema';
import { UserOrgRelation } from './schemas/user-org-relation.schema';

@Injectable()
export class OrgService 
{
    private readonly logger = new Logger(OrgService.name);

    constructor(
        @InjectModel(Org.name) private readonly organizationModel: Model<Org>,
        @InjectModel(UserOrgRelation.name) private readonly relationshipModel: Model<UserOrgRelation>,
    ) {}

    async findById(orgId: string): Promise<Org | null> 
    {
        this.logger.debug(`Finding organization by ID: ${orgId}`, 'OrgService#findById');
        const org = await this.organizationModel.findById(orgId).exec();
        if (!org)
        {
            this.logger.warn(`Organization not found for ID: ${orgId}`, 'OrgService#findById');
            return null;
        }
        this.logger.debug(`Found organization: ${org.name} for ID: ${orgId}`, 'OrgService#findById');
        return org;
    }
}
