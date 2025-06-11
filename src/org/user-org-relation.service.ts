import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { OrgRole, UserOrgRelation } from './schemas/user-org-relation.schema';

@Injectable()
export class UserOrgRelationService 
{
    private readonly logger = new Logger(UserOrgRelationService.name);

    constructor(
        @InjectModel(UserOrgRelation.name) private readonly userOrgRelationModel: Model<UserOrgRelation>,
    ) {}

    async findAll(userId: string, orgRole?: OrgRole): Promise<UserOrgRelation[]>
    {
        this.logger.debug(`Finding user-org relations for user: ${userId} with orgRole filter: ${orgRole}`, 'UserOrgRelationService#findAllAndPopulateOrg');
        const query: FilterQuery<UserOrgRelation> = { userId };
        if (orgRole !== null && orgRole !== undefined)
        {
            query.orgRole = orgRole;
        }
        const userOrgRelations = await this.userOrgRelationModel
            .find(query)
            .exec();
        this.logger.debug(`Found ${userOrgRelations.length} user-org relations for user: ${userId}`, 'UserOrgRelationService#findAllAndPopulateOrg');
        return userOrgRelations;
    }

    async findOne(userId: string, orgId: string): Promise<UserOrgRelation | null>
    {
        this.logger.debug(`Finding user-org relationship for user: ${userId} in org: ${orgId}`, 'UserOrgRelationService#findOne');
        const relationship = await this.userOrgRelationModel
            .findOne({ userId, orgId })
            .exec();
        if (!relationship) 
        {
            this.logger.warn(`No relationship found for user: ${userId} in org: ${orgId}`, 'UserOrgRelationService#findOne');
        }
        else 
        {
            this.logger.debug(`Found relationship: ${relationship.orgRole} for user: ${userId} in org: ${orgId}`, 'UserOrgRelationService#findOne');
        }
        return relationship;
    }
}
