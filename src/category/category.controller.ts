import { 
    Controller, 
    Get, 
    Post, 
    Put, 
    Delete, 
    Body, 
    Param, 
    UseGuards,
    Logger,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CategoryService } from './category.service';
import { InCreateCategoryDto } from './dto/in.create-category.dto';
import { InUpdateCategoryDto } from './dto/in.update-category.dto';
import { OutCategoryDto } from './dto/out.category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRolesGuard } from '../org/guards/org-roles.guard';
import { OrgRoles } from '../org/decorators/org-roles.decorator';
import { OrgRole } from '../org/schemas/user-org-relation.schema';
import { ObjectIdValidationPipe } from '../pipes/object-id-validation.pipe';
import { plainToInstance } from 'class-transformer';

@Controller('orgs/:orgId/categories')
@UseGuards(JwtAuthGuard, OrgRolesGuard)
export class CategoryController 
{
    private readonly logger = new Logger(CategoryController.name);

    constructor(private readonly categoryService: CategoryService) {}

    @Get()
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER, OrgRole.STAFF)
    async getCategories(
        @Param('orgId', ObjectIdValidationPipe) orgId: Types.ObjectId,
    ): Promise<OutCategoryDto[]> 
    {
        this.logger.debug(`Getting categories for org ${orgId}`, 'CategoryController#getCategories');
        
        const categories = await this.categoryService.findCategoriesByOrg(orgId);
        return plainToInstance(OutCategoryDto, categories, { excludeExtraneousValues: true });
    }

    @Get(':id')
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER, OrgRole.STAFF)
    async getCategory(
        @Param('orgId', ObjectIdValidationPipe) orgId: Types.ObjectId,
        @Param('id', ObjectIdValidationPipe) categoryId: Types.ObjectId,
    ): Promise<OutCategoryDto> 
    {
        this.logger.debug(`Getting category ${categoryId} for org ${orgId}`, 'CategoryController#getCategory');
        
        const category = await this.categoryService.findCategoryById(orgId, categoryId);
        return plainToInstance(OutCategoryDto, category, { excludeExtraneousValues: true });
    }

    @Post()
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER)
    async createCategory(
        @Param('orgId', ObjectIdValidationPipe) orgId: Types.ObjectId,
        @Body() createCategoryDto: InCreateCategoryDto,
    ): Promise<OutCategoryDto> 
    {
        this.logger.debug(`Creating category for org ${orgId}`, 'CategoryController#createCategory');
        
        const category = await this.categoryService.createCategory(orgId, createCategoryDto);
        return plainToInstance(OutCategoryDto, category, { excludeExtraneousValues: true });
    }

    @Put(':id')
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER)
    async updateCategory(
        @Param('orgId', ObjectIdValidationPipe) orgId: Types.ObjectId,
        @Param('id', ObjectIdValidationPipe) categoryId: Types.ObjectId,
        @Body() updateCategoryDto: InUpdateCategoryDto,
    ): Promise<OutCategoryDto> 
    {
        this.logger.debug(`Updating category ${categoryId} for org ${orgId}`, 'CategoryController#updateCategory');
        
        const category = await this.categoryService.updateCategory(orgId, categoryId, updateCategoryDto);
        return plainToInstance(OutCategoryDto, category, { excludeExtraneousValues: true });
    }

    @Delete(':id')
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER)
    async deleteCategory(
        @Param('orgId', ObjectIdValidationPipe) orgId: Types.ObjectId,
        @Param('id', ObjectIdValidationPipe) categoryId: Types.ObjectId,
    ): Promise<{ message: string }> 
    {
        this.logger.debug(`Deleting category ${categoryId} for org ${orgId}`, 'CategoryController#deleteCategory');
        
        await this.categoryService.deleteCategory(orgId, categoryId);
        return { message: 'Category deleted successfully' };
    }
}
