import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';
import { UserOrgRelationService } from './user-org-relation.service';
import { InvitationService } from './invitation.service';
import { InvitationPublicController } from './invitation-public.controller';
import { InvitationController } from './invitation.controller';
import { Org, OrgSchema } from './schemas/org.schema';
import { 
    UserOrgRelation, 
    UserOrgRelationSchema,
} from './schemas/user-org-relation.schema';
import { OrgInvite, OrgInviteSchema } from './schemas/org-invite.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserModule } from '../user/user.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Org.name, schema: OrgSchema },
            { name: UserOrgRelation.name, schema: UserOrgRelationSchema },
            { name: OrgInvite.name, schema: OrgInviteSchema },
            { name: User.name, schema: UserSchema },
        ]),
        ConfigModule,
        JwtModule,
        UserModule,
        SubscriptionModule,
        EmailModule,
    ],
    controllers: [OrgController, InvitationPublicController, InvitationController],
    providers: [OrgService, UserOrgRelationService, InvitationService, JwtAuthGuard],
    exports: [OrgService, UserOrgRelationService, InvitationService],
})
export class OrgModule { }
