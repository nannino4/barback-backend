import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { Org, OrgSchema } from './schemas/org.schema';
import { 
    UserOrgRelationship, 
    UserOrgRelationshipSchema,
} from './schemas/user-org-relationship.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Org.name, schema: OrgSchema },
            { name: UserOrgRelationship.name, schema: UserOrgRelationshipSchema },
        ]),
    ],
    controllers: [OrganizationController],
    providers: [OrganizationService],
    exports: [OrganizationService],
})
export class OrganizationModule { }
