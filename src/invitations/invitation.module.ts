import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Invitation, InvitationSchema } from "./schemas/invitation.schema";
import { JwtModule } from "@nestjs/jwt";
import { EmailModule } from "../email/email.module";
import { InvitationController } from "./invitation.controller";
import { InvitationPublicController } from "./invitation-public.controller";
import { InvitationService } from "./invitation.service";
import { UserOrgRelation, UserOrgRelationSchema } from "src/org/schemas/user-org-relation.schema";
import { User, UserSchema } from "../user/schemas/user.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Invitation.name, schema: InvitationSchema },
            { name: UserOrgRelation.name, schema: UserOrgRelationSchema },
            { name: User.name, schema: UserSchema},
        ]),
        JwtModule,
        EmailModule,
    ],
    controllers: [InvitationController, InvitationPublicController],
    providers: [InvitationService],
    exports: [InvitationService],
})
export class InvitationModule {}