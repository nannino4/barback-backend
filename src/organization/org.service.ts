import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Org } from './schemas/org.schema';
import { UserOrgRelationship } from './schemas/user-org-relationship.schema';

@Injectable()
export class OrgService 
{
    private readonly logger = new Logger(OrgService.name);

    constructor(
        @InjectModel(Org.name) private readonly organizationModel: Model<Org>,
        @InjectModel(UserOrgRelationship.name) private readonly relationshipModel: Model<UserOrgRelationship>,
    ) {}
}
