import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { Organization, OrganizationSchema } from './schemas/organization.schema';
import { 
    UserOrgRelationship, 
    UserOrgRelationshipSchema,
} from './schemas/user-org-relationship.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Organization.name, schema: OrganizationSchema },
            { name: UserOrgRelationship.name, schema: UserOrgRelationshipSchema },
        ]),
    ],
    controllers: [OrganizationController],
    providers: [OrganizationService],
    exports: [OrganizationService],
})
export class OrganizationModule { }
