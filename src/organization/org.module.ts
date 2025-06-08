import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';
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
    controllers: [OrgController],
    providers: [OrgService],
    exports: [OrgService],
})
export class OrgModule { }
