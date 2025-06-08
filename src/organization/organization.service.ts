import { Injectable, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Org } from './schemas/org.schema';
import { UserOrgRelationship, OrgRole } from './schemas/user-org-relationship.schema';

@Injectable()
export class OrganizationService 
{
    private readonly logger = new Logger(OrganizationService.name);

    constructor(
        @InjectModel(Org.name) private readonly organizationModel: Model<Org>,
        @InjectModel(UserOrgRelationship.name) private readonly relationshipModel: Model<UserOrgRelationship>,
    ) {}
}
