import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { OrgRole, UserOrgRelation } from './schemas/user-org-relation.schema';

@Injectable()
export class UserOrgRelationService 
{
    private readonly logger = new Logger(UserOrgRelationService.name);

    constructor(
        @InjectModel(UserOrgRelation.name) private readonly userOrgRelationModel: Model<UserOrgRelation>,
    ) {}

    async findAll(userId?: Types.ObjectId, orgRole?: OrgRole, orgId?: Types.ObjectId): Promise<UserOrgRelation[]>
    {
        this.logger.debug(`Finding user-org relations with userId: ${userId}, orgRole: ${orgRole}, orgId: ${orgId}`, 'UserOrgRelationService#findAll');
        const query: FilterQuery<UserOrgRelation> = {};
        
        if (userId !== null && userId !== undefined)
        {
            query.userId = userId;
        }
        
        if (orgRole !== null && orgRole !== undefined)
        {
            query.orgRole = orgRole;
        }
        
        if (orgId !== null && orgId !== undefined)
        {
            query.orgId = orgId;
        }
        
        const userOrgRelations = await this.userOrgRelationModel
            .find(query)
            .exec();
        this.logger.debug(`Found ${userOrgRelations.length} user-org relations`, 'UserOrgRelationService#findAll');
        return userOrgRelations;
    }

    async findOne(userId: Types.ObjectId, orgId: Types.ObjectId): Promise<UserOrgRelation | null>
    {
        this.logger.debug(`Finding user-org relationship for user: ${userId} in org: ${orgId}`, 'UserOrgRelationService#findOne');
        const relationship = await this.userOrgRelationModel
            .findOne({ 
                userId: userId, 
                orgId: orgId, 
            })
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

    async updateRole(userId: Types.ObjectId, orgId: Types.ObjectId, newRole: OrgRole): Promise<UserOrgRelation>
    {
        this.logger.debug(`Attempting to update role for user: ${userId} in org: ${orgId} to role: ${newRole}`, 'UserOrgRelationService#updateRole');
        const relationship = await this.userOrgRelationModel.findOneAndUpdate(
            { userId: userId, orgId: orgId },
            { $set: { orgRole: newRole } },
            { new: true, runValidators: true }
        ).exec();
        
        if (!relationship)
        {
            this.logger.warn(`User-org relationship not found for user: ${userId} in org: ${orgId}`, 'UserOrgRelationService#updateRole');
            throw new NotFoundException(`User is not a member of this organization`);
        }
        
        this.logger.debug(`Role updated successfully for user: ${userId} in org: ${orgId} to role: ${newRole}`, 'UserOrgRelationService#updateRole');
        return relationship;
    }
}
