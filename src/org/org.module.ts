import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';
import { UserOrgRelationService } from './user-org-relation.service';
import { Org, OrgSchema } from './schemas/org.schema';
import { 
    UserOrgRelation, 
    UserOrgRelationSchema,
} from './schemas/user-org-relation.schema';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Org.name, schema: OrgSchema },
            { name: UserOrgRelation.name, schema: UserOrgRelationSchema },
        ]),
        AuthModule,
        UserModule,
    ],
    controllers: [OrgController],
    providers: [OrgService, UserOrgRelationService],
    exports: [OrgService, UserOrgRelationService],
})
export class OrgModule { }
