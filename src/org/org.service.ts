import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Org } from './schemas/org.schema';
import { UserOrgRelationship, OrgRole } from './schemas/user-org-relationship.schema';

@Injectable()
export class OrgService 
{
    private readonly logger = new Logger(OrgService.name);

    constructor(
        @InjectModel(Org.name) private readonly organizationModel: Model<Org>,
        @InjectModel(UserOrgRelationship.name) private readonly relationshipModel: Model<UserOrgRelationship>,
    ) {}

    async findUserOrgRelationships(userId: string, roleFilter?: OrgRole): Promise<UserOrgRelationship[]>
    {
        this.logger.debug(`Finding org relationships for user: ${userId} with role filter: ${roleFilter}`, 'OrgService#findUserOrgRelationships');
        
        const filter: any = { userId: new Types.ObjectId(userId) };
        
        if (roleFilter)
        {
            filter.role = roleFilter;
        }

        const relationships = await this.relationshipModel
            .find(filter)
            .populate('organizationId', 'name')
            .populate('userId', 'email firstName lastName profilePictureUrl')
            .exec();

        this.logger.debug(`Found ${relationships.length} organization relationships for user`, 'OrgService#findUserOrganizations');
        return relationships;
    }
}
