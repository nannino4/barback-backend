import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category } from './schemas/category.schema';
import { InCreateCategoryDto } from './dto/in.create-category.dto';
import { InUpdateCategoryDto } from './dto/in.update-category.dto';

@Injectable()
export class CategoryService 
{
    private readonly logger = new Logger(CategoryService.name);

    constructor(
        @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
    ) {}

    async createCategory(orgId: Types.ObjectId, createCategoryDto: InCreateCategoryDto): Promise<Category> 
    {
        this.logger.debug(`Creating category for org ${orgId}`, 'CategoryService#createCategory');
        // If parentId is provided, validate it exists and belongs to the same org
        if (createCategoryDto.parentId) 
        {
            const parentIdObj = new Types.ObjectId(createCategoryDto.parentId);
            await this.validateParentCategory(orgId, parentIdObj);
        }
        const category = new this.categoryModel({
            ...createCategoryDto,
            parentId: createCategoryDto.parentId ? new Types.ObjectId(createCategoryDto.parentId) : undefined,
            orgId,
        });
        const savedCategory = await category.save();
        this.logger.debug(`Category created with id: ${savedCategory._id}`, 'CategoryService#createCategory');
        return savedCategory;
    }

    async findCategoriesByOrg(orgId: Types.ObjectId): Promise<Category[]> 
    {
        this.logger.debug(`Finding categories for org ${orgId}`, 'CategoryService#findCategoriesByOrg');
        return this.categoryModel
            .find({ orgId })
            .sort({ name: 1 })
            .exec();
    }

    async findCategoryById(orgId: Types.ObjectId, categoryId: Types.ObjectId): Promise<Category> 
    {
        this.logger.debug(`Finding category ${categoryId} for org ${orgId}`, 'CategoryService#findCategoryById');
        const category = await this.categoryModel
            .findOne({ _id: categoryId, orgId })
            .exec();
        if (!category) 
        {
            this.logger.warn(`Category ${categoryId} not found for org ${orgId}`, 'CategoryService#findCategoryById');
            throw new NotFoundException('Category not found');
        }
        return category;
    }

    async updateCategory(
        orgId: Types.ObjectId, 
        categoryId: Types.ObjectId, 
        updateCategoryDto: InUpdateCategoryDto
    ): Promise<Category> 
    {
        this.logger.debug(`Updating category ${categoryId} for org ${orgId}`, 'CategoryService#updateCategory');

        // Check if category exists and belongs to the org
        await this.findCategoryById(orgId, categoryId);
        // If parentId is being updated, validate it
        if (updateCategoryDto.parentId !== undefined) 
        {
            if (updateCategoryDto.parentId) 
            {
                const parentIdObj = new Types.ObjectId(updateCategoryDto.parentId);
                
                // Prevent setting self as parent
                if (parentIdObj.equals(categoryId)) 
                {
                    throw new BadRequestException('Category cannot be its own parent');
                }

                await this.validateParentCategory(orgId, parentIdObj);
                
                // Check for circular references
                await this.checkCircularReference(categoryId, parentIdObj);
            }
        }

        // Convert parentId string to ObjectId for database update
        const updateData = {
            ...updateCategoryDto,
            parentId: updateCategoryDto.parentId ? new Types.ObjectId(updateCategoryDto.parentId) : updateCategoryDto.parentId,
        };

        const updatedCategory = await this.categoryModel
            .findOneAndUpdate(
                { _id: categoryId, orgId },
                updateData,
                { new: true }
            )
            .exec();

        if (!updatedCategory) 
        {
            throw new NotFoundException('Category not found');
        }

        this.logger.debug(`Category ${categoryId} updated successfully`, 'CategoryService#updateCategory');
        return updatedCategory;
    }

    async deleteCategory(orgId: Types.ObjectId, categoryId: Types.ObjectId): Promise<void> 
    {
        this.logger.debug(`Deleting category ${categoryId} for org ${orgId}`, 'CategoryService#deleteCategory');

        // Check if category exists and belongs to the org
        await this.findCategoryById(orgId, categoryId);

        // Check if category has child categories
        const childCategories = await this.categoryModel
            .find({ parentId: categoryId, orgId })
            .exec();

        if (childCategories.length > 0) 
        {
            throw new BadRequestException('Cannot delete category with child categories. Please delete or reassign child categories first.');
        }

        const result = await this.categoryModel
            .deleteOne({ _id: categoryId, orgId })
            .exec();

        if (result.deletedCount === 0) 
        {
            throw new NotFoundException('Category not found');
        }

        this.logger.debug(`Category ${categoryId} deleted successfully`, 'CategoryService#deleteCategory');
    }

    private async validateParentCategory(orgId: Types.ObjectId, parentId: Types.ObjectId): Promise<void> 
    {
        const parentCategory = await this.categoryModel
            .findOne({ _id: parentId, orgId })
            .exec();

        if (!parentCategory) 
        {
            throw new BadRequestException('Parent category not found or does not belong to the organization');
        }
    }

    private async checkCircularReference(categoryId: Types.ObjectId, parentId: Types.ObjectId): Promise<void> 
    {
        const visited = new Set<string>();
        let currentParentId: Types.ObjectId | null = parentId;

        while (currentParentId) 
        {
            const currentParentIdStr = currentParentId.toString();
            
            if (visited.has(currentParentIdStr)) 
            {
                throw new BadRequestException('Circular reference detected in category hierarchy');
            }

            if (currentParentId.equals(categoryId)) 
            {
                throw new BadRequestException('Circular reference detected: category cannot be a descendant of itself');
            }

            visited.add(currentParentIdStr);

            const parentCategory = await this.categoryModel
                .findById(currentParentId)
                .exec();

            currentParentId = parentCategory?.parentId || null;
        }
    }
}
