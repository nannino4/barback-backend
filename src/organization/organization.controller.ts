import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveSubscriptionGuard } from '../subscription/guards/active-subscription.guard';
import { OrganizationRolesGuard } from './guards/organization-roles.guard';
import { OrgRoles } from './decorators/org-roles.decorator';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/in.create-organization.dto';
import { UpdateOrganizationDto } from './dto/in.update-organization.dto';
import { UpdateMemberRoleDto } from './dto/in.update-member-role.dto';
import { OutOrganizationDto } from './dto/out.organization.dto';
import { OutOrganizationMemberDto } from './dto/out.organization-member.dto';
import { OutUserInvitationDto } from './dto/out.user-invitation.dto';
import { OrgRole } from './schemas/user-org-relationship.schema';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/schemas/user.schema';
import { plainToInstance } from 'class-transformer';

@Controller()
@UseGuards(JwtAuthGuard)
export class OrganizationController
{
    constructor(private readonly organizationService: OrganizationService) { }

    @Get('organizations/owned')
    async getOwnedOrganizations(@CurrentUser() user: User): Promise<OutOrganizationDto[]>
    {
        const organizations = await this.organizationService.getOwnedOrganizations(user.id);
        return plainToInstance(OutOrganizationDto, organizations);
    }

    @Get('organizations/member')
    async getMemberOrganizations(@CurrentUser() user: User): Promise<OutOrganizationDto[]>
    {
        const organizations = await this.organizationService.getUserOrganizations(user.id);
        return plainToInstance(OutOrganizationDto, organizations);
    }

    @Get('organizations/:id/members')
    @UseGuards(OrganizationRolesGuard)
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER, OrgRole.STAFF)
    async getOrganizationMembers(@Param('id') organizationId: string): Promise<OutOrganizationMemberDto[]>
    {
        const members = await this.organizationService.getOrganizationMembers(organizationId);
        return plainToInstance(OutOrganizationMemberDto, members);
    }

    @Get('invitations')
    async getUserInvitations(@CurrentUser() user: User): Promise<OutUserInvitationDto[]>
    {
        const invitations = await this.organizationService.getUserInvitations(user.email);
        return plainToInstance(OutUserInvitationDto, invitations);
    }

    @Post('organizations')
    @UseGuards(ActiveSubscriptionGuard)
    async createOrganization(
        @Body() createOrganizationDto: CreateOrganizationDto,
        @CurrentUser() user: User,
    ): Promise<OutOrganizationDto>
    {
        // Note: We need to get user's subscription ID from the subscription service
        // For now, using a placeholder. This should be implemented with proper subscription integration
        const subscriptionId = 'placeholder-subscription-id';
        
        const organization = await this.organizationService.create(
            createOrganizationDto,
            user.id,
            subscriptionId,
        );
        return plainToInstance(OutOrganizationDto, organization);
    }

    @Put('organizations/:id')
    @UseGuards(OrganizationRolesGuard)
    @OrgRoles(OrgRole.OWNER)
    async updateOrganization(
        @Param('id') organizationId: string,
        @Body() updateOrganizationDto: UpdateOrganizationDto,
        @CurrentUser() user: User,
    ): Promise<OutOrganizationDto>
    {
        const organization = await this.organizationService.updateOrganization(
            organizationId,
            updateOrganizationDto,
            user.id,
        );
        return plainToInstance(OutOrganizationDto, organization);
    }

    @Put('organizations/:id/members/:userId/role')
    @UseGuards(OrganizationRolesGuard)
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER)
    async updateMemberRole(
        @Param('id') organizationId: string,
        @Param('userId') userId: string,
        @Body() updateMemberRoleDto: UpdateMemberRoleDto,
        @CurrentUser() user: User,
    ): Promise<OutOrganizationMemberDto>
    {
        const updatedMember = await this.organizationService.updateMemberRole(
            organizationId,
            userId,
            updateMemberRoleDto.role,
            user.id,
        );
        return plainToInstance(OutOrganizationMemberDto, updatedMember);
    }
}
