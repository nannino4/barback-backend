import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { Organization, OrganizationSchema } from './schemas/organization.schema';
import { UserOrganization, UserOrganizationSchema } from './schemas/user-organization.schema';
import { User, UserSchema } from '../user/schemas/user.schema'; // Assuming User schema is in a parent 'user' directory

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Organization.name, schema: OrganizationSchema },
            { name: UserOrganization.name, schema: UserOrganizationSchema },
            { name: User.name, schema: UserSchema }, // Import User schema if needed for population or validation
        ]),
    ],
    controllers: [OrganizationController],
    providers: [OrganizationService],
    exports: [OrganizationService], // Export if other modules need to use OrganizationService
})
export class OrganizationModule {}
