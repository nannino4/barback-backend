import {
    Controller,
    Get,
    Query,
    UseGuards,
    Logger,
    ConflictException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/schemas/user.schema';
import { OrgService } from './org.service';
import { OrgRole } from './schemas/user-org-relation.schema';
import { UserOrgRelationService } from './user-org-relation.service';
import { OutUserOrgRelationDto } from './dto/out.user-org-relation';
import { OutOrgDto } from './dto/out.org.dto';
import { plainToInstance } from 'class-transformer';
import { OutUserPublicDto } from '../user/dto/out.user.public.dto';

@Controller('orgs')
@UseGuards(JwtAuthGuard)
export class OrgController
{
    private readonly logger = new Logger(OrgController.name);

    constructor(
        private readonly orgService: OrgService,
        private readonly userOrgRelationService: UserOrgRelationService
    ) { }

    @Get()
    async getUserOrgs(
        @CurrentUser() user: User,
        @Query('orgRole') orgRole?: OrgRole
    ): Promise<OutUserOrgRelationDto[]>
    {
        this.logger.debug(`Getting organizations for user: ${user.email} with role filter: ${orgRole}`, 'OrgController#getUserOrgs');
        const userOrgRelations = await this.userOrgRelationService.findAll(user.id, orgRole);
        const result: OutUserOrgRelationDto[] = [];
        for (const relation of userOrgRelations) 
        {
            const org = await this.orgService.findById(relation.orgId);
            if (!org) 
            {
                this.logger.warn(`Organization not found for relation: ${relation.id}`, 'OrgController#getUserOrgs');
                throw new ConflictException(`Organization not found for relation: ${relation.id}`);
            }
            result.push(
                plainToInstance(OutUserOrgRelationDto, {
                    user: plainToInstance(OutUserPublicDto, user.toObject()),
                    org: plainToInstance(OutOrgDto, org.toObject()),
                    role: relation.orgRole,
                }, { excludeExtraneousValues: true })
            );
        }
        this.logger.debug(`Returning ${result.length} organization relationships for user`, 'OrgController#getUserOrgs');
        return result;
    }
}
