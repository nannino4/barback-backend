import {
    Controller,
    Get,
    Query,
    UseGuards,
    Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/schemas/user.schema';
import { OrgService } from './org.service';
import { OrgRole } from './schemas/user-org-relationship.schema';
import { OutUserOrgRelationshipDto } from './dto/out.user-org-relationship';
import { plainToInstance } from 'class-transformer';

@Controller('orgs')
@UseGuards(JwtAuthGuard)
export class OrgController
{
    private readonly logger = new Logger(OrgController.name);

    constructor(private readonly organizationService: OrgService) { }

    @Get()
    async getUserOrgs(
        @CurrentUser() user: User,
        @Query('orgRole') orgRole?: OrgRole
    ): Promise<OutUserOrgRelationshipDto[]>
    {
        this.logger.debug(`Getting organizations for user: ${user.email} with role filter: ${orgRole}`, 'OrgController#getUserOrganizations');
        
        const relationships = await this.organizationService.findUserOrgRelationships(user.id, orgRole);
        
        const result = relationships.map(relationship => 
            plainToInstance(OutUserOrgRelationshipDto, relationship.toObject(), { excludeExtraneousValues: true })
        );

        this.logger.debug(`Returning ${result.length} organization relationships for user`, 'OrgController#getUserOrganizations');
        return result;
    }
}
