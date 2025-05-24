import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';
import { Org, OrgSchema } from './schemas/org.schema';
import { UserOrg, UserOrgSchema } from './schemas/user-org.schema';
import { User, UserSchema } from '../user/schemas/user.schema'; // Assuming User schema is in a parent 'user' directory

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Org.name, schema: OrgSchema },
            { name: UserOrg.name, schema: UserOrgSchema },
            { name: User.name, schema: UserSchema }, // Import User schema if needed for population or validation
        ]),
    ],
    controllers: [OrgController],
    providers: [OrgService],
    exports: [OrgService], // Export if other modules need to use OrgService
})
export class OrgModule {}
