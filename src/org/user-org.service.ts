import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UserOrgRelationship } from "./schemas/user-org-relationship.schema";

@Injectable()
export class UserOrgService
{
    private readonly logger = new Logger(UserOrgService.name);

    constructor(
        @InjectModel(UserOrgRelationship.name) private readonly relationshipModel: Model<UserOrgRelationship>,
    ) {}

    async findOne(userId: string, orgId: string): Promise<UserOrgRelationship | null>
    {
        this.logger.debug(`Finding user-org relationship for user: ${userId} in org: ${orgId}`, 'UserOrgService#findOne');
        const relationship = await this.relationshipModel
            .findOne({ userId, orgId })
            .exec();
        if (!relationship) 
        {
            this.logger.warn(`No relationship found for user: ${userId} in org: ${orgId}`, 'UserOrgService#findOne');
        }
        else 
        {
            this.logger.debug(`Found relationship: ${relationship.role} for user: ${userId} in org: ${orgId}`, 'UserOrgService#findOne');
        }
        return relationship;
    }
}