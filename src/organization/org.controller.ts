import {
    Controller,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgService } from './org.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class OrgController
{
    constructor(private readonly organizationService: OrgService) { }

}
