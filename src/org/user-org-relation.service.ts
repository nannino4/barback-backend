import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { OrgRole, UserOrgRelation } from './schemas/user-org-relation.schema';
import { CustomLogger } from '../common/logger/custom.logger';
import { DatabaseOperationException } from '../common/exceptions/database.exceptions';
import { UserNotMemberException } from './exceptions/org.exceptions';

@Injectable()
export class UserOrgRelationService 
{
    constructor(
        @InjectModel(UserOrgRelation.name) private readonly userOrgRelationModel: Model<UserOrgRelation>,
        private readonly logger: CustomLogger,
    ) {}


    async findAll(userId?: Types.ObjectId, orgRole?: OrgRole, orgId?: Types.ObjectId): Promise<UserOrgRelation[]>
    {
        this.logger.debug(`Finding user-org relations with userId: ${userId}, orgRole: ${orgRole}, orgId: ${orgId}`, 'UserOrgRelationService#findAll');
        
        try 
        {
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
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Database error during user-org relations lookup`, errorStack, 'UserOrgRelationService#findAll');
            throw new DatabaseOperationException('user-org relations lookup', errorMessage);
        }
    }

    async findOne(userId: Types.ObjectId, orgId: Types.ObjectId): Promise<UserOrgRelation | null>
    {
        this.logger.debug(`Finding user-org relationship for user: ${userId} in org: ${orgId}`, 'UserOrgRelationService#findOne');
        
        try 
        {
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
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Database error during user-org relationship lookup: user ${userId} in org ${orgId}`, errorStack, 'UserOrgRelationService#findOne');
            throw new DatabaseOperationException('user-org relationship lookup', errorMessage);
        }
    }

    async updateRole(userId: Types.ObjectId, orgId: Types.ObjectId, newRole: OrgRole): Promise<UserOrgRelation>
    {
        this.logger.debug(`Attempting to update role for user: ${userId} in org: ${orgId} to role: ${newRole}`, 'UserOrgRelationService#updateRole');
        
        try 
        {
            const relationship = await this.userOrgRelationModel.findOneAndUpdate(
                { userId: userId, orgId: orgId },
                { $set: { orgRole: newRole } },
                { new: true, runValidators: true }
            ).exec();
            
            if (!relationship)
            {
                this.logger.warn(`User-org relationship not found for user: ${userId} in org: ${orgId}`, 'UserOrgRelationService#updateRole');
                throw new UserNotMemberException(userId.toString(), orgId.toString());
            }
            
            this.logger.debug(`Role updated successfully for user: ${userId} in org: ${orgId} to role: ${newRole}`, 'UserOrgRelationService#updateRole');
            return relationship;
        }
        catch (error)
        {
            if (error instanceof UserNotMemberException)
            {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Database error during role update: user ${userId} in org ${orgId}`, errorStack, 'UserOrgRelationService#updateRole');
            throw new DatabaseOperationException('user-org role update', errorMessage);
        }
    }
}
