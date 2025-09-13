import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Invitation, InvitationSchema } from "./schemas/invitation.schema";
import { EmailModule } from "../email/email.module";
import { InvitationController } from "./invitation.controller";
import { InvitationService } from "./invitation.service";
import { UserOrgRelation, UserOrgRelationSchema } from "src/org/schemas/user-org-relation.schema";
import { UserModule } from "../user/user.module";
import { AuthGuardModule } from "src/auth/auth-guard.module";
import { OrgModule } from "src/org/org.module";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Invitation.name, schema: InvitationSchema },
            { name: UserOrgRelation.name, schema: UserOrgRelationSchema },
        ]),
        AuthGuardModule, // Provides guards for controllers
        EmailModule, // Used by InvitationService
        UserModule, // Used for user operations
        OrgModule,
    ],
    controllers: [InvitationController],
    providers: [InvitationService],
    exports: [InvitationService],
})
export class InvitationModule {}