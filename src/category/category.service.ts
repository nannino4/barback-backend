import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category } from './schemas/category.schema';
import { InCreateCategoryDto } from './dto/in.create-category.dto';
import { InUpdateCategoryDto } from './dto/in.update-category.dto';
import { CustomLogger } from '../common/logger/custom.logger';
import { DatabaseOperationException } from '../common/exceptions/database.exceptions';
import { 
    CategoryNotFoundException, 
    CategoryNameConflictException,
    InvalidParentCategoryException,
    CategoryCircularReferenceException,
    CategorySelfParentException,
    CategoryHasChildrenException,
} from './exceptions/category.exceptions';

@Injectable()
export class CategoryService 
{
    constructor(
        @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
        private readonly logger: CustomLogger,
    ) {}

    async createCategory(orgId: Types.ObjectId, createCategoryDto: InCreateCategoryDto): Promise<Category> 
    {
        this.logger.debug(`Creating category for org ${orgId}`, 'CategoryService#createCategory');
        
        // Check for duplicate name in organization
        if (await this.categoryExistsByName(orgId, createCategoryDto.name)) 
        {
            throw new CategoryNameConflictException(createCategoryDto.name);
        }

        // If parentId is provided, validate it exists and belongs to the same org
        if (createCategoryDto.parentId) 
        {
            const parentIdObj = new Types.ObjectId(createCategoryDto.parentId);
            await this.validateParentCategory(orgId, parentIdObj);
        }

        // Create and save the category
        const category = new this.categoryModel({
            ...createCategoryDto,
            parentId: createCategoryDto.parentId ? new Types.ObjectId(createCategoryDto.parentId) : undefined,
            orgId,
        });

        try 
        {
            const savedCategory = await category.save();
            this.logger.debug(`Category created with id: ${savedCategory._id}`, 'CategoryService#createCategory');
            return savedCategory;
        } 
        catch (error: any) 
        {
            this.logger.error(`Error saving category: ${error.message}`, 'CategoryService#createCategory');
            throw new DatabaseOperationException('category creation', error.message);
        }
    }

    async findCategoriesByOrg(orgId: Types.ObjectId): Promise<Category[]> 
    {
        this.logger.debug(`Finding categories for org ${orgId}`, 'CategoryService#findCategoriesByOrg');
        
        try 
        {
            return await this.categoryModel
                .find({ orgId })
                .sort({ name: 1 })
                .exec();
        } 
        catch (error: any) 
        {
            this.logger.error(`Error finding categories for org ${orgId}: ${error.message}`, 'CategoryService#findCategoriesByOrg');
            throw new DatabaseOperationException('categories retrieval', error.message);
        }
    }

    async findCategoryById(orgId: Types.ObjectId, categoryId: Types.ObjectId): Promise<Category> 
    {
        this.logger.debug(`Finding category ${categoryId} for org ${orgId}`, 'CategoryService#findCategoryById');
        
        let category;
        try 
        {
            category = await this.categoryModel
                .findOne({ _id: categoryId, orgId })
                .exec();
        } 
        catch (error: any) 
        {
            this.logger.error(`Error finding category ${categoryId}: ${error.message}`, 'CategoryService#findCategoryById');
            throw new DatabaseOperationException('category retrieval', error.message);
        }
            
        if (!category) 
        {
            this.logger.warn(`Category ${categoryId} not found for org ${orgId}`, 'CategoryService#findCategoryById');
            throw new CategoryNotFoundException(categoryId.toString());
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

        // Check for duplicate name if name is being updated
        if (updateCategoryDto.name) 
        {
            if (await this.categoryExistsByNameExcluding(orgId, updateCategoryDto.name, categoryId)) 
            {
                throw new CategoryNameConflictException(updateCategoryDto.name);
            }
        }

        // If parentId is being updated, validate it
        if (updateCategoryDto.parentId !== undefined) 
        {
            if (updateCategoryDto.parentId) 
            {
                const parentIdObj = new Types.ObjectId(updateCategoryDto.parentId);
                
                // Prevent setting self as parent
                if (parentIdObj.equals(categoryId)) 
                {
                    throw new CategorySelfParentException();
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

        let updatedCategory;
        try 
        {
            updatedCategory = await this.categoryModel
                .findOneAndUpdate(
                    { _id: categoryId, orgId },
                    updateData,
                    { new: true }
                )
                .exec();
        } 
        catch (error: any) 
        {
            this.logger.error(`Error updating category ${categoryId}: ${error.message}`, 'CategoryService#updateCategory');
            throw new DatabaseOperationException('category update', error.message);
        }

        if (!updatedCategory) 
        {
            throw new CategoryNotFoundException(categoryId.toString());
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
        let childCategories;
        try 
        {
            childCategories = await this.categoryModel
                .find({ parentId: categoryId, orgId })
                .exec();
        } 
        catch (error: any) 
        {
            this.logger.error(`Error checking for child categories: ${error.message}`, 'CategoryService#deleteCategory');
            throw new DatabaseOperationException('child categories check', error.message);
        }

        if (childCategories.length > 0) 
        {
            throw new CategoryHasChildrenException();
        }

        let result;
        try 
        {
            result = await this.categoryModel
                .deleteOne({ _id: categoryId, orgId })
                .exec();
        } 
        catch (error: any) 
        {
            this.logger.error(`Error deleting category ${categoryId}: ${error.message}`, 'CategoryService#deleteCategory');
            throw new DatabaseOperationException('category deletion', error.message);
        }

        if (result.deletedCount === 0) 
        {
            throw new CategoryNotFoundException(categoryId.toString());
        }

        this.logger.debug(`Category ${categoryId} deleted successfully`, 'CategoryService#deleteCategory');
    }

    private async validateParentCategory(orgId: Types.ObjectId, parentId: Types.ObjectId): Promise<void> 
    {
        if (!(await this.categoryExists(orgId, parentId))) 
        {
            throw new InvalidParentCategoryException(parentId.toString());
        }
    }

    private async categoryExists(orgId: Types.ObjectId, categoryId: Types.ObjectId): Promise<boolean> 
    {
        try 
        {
            const count = await this.categoryModel
                .countDocuments({ _id: categoryId, orgId })
                .exec();
            return count > 0;
        } 
        catch (error: any) 
        {
            this.logger.error(`Error checking category existence ${categoryId}: ${error.message}`, 'CategoryService#categoryExists');
            throw new DatabaseOperationException('category existence check', error.message);
        }
    }

    private async categoryExistsByName(orgId: Types.ObjectId, name: string): Promise<boolean> 
    {
        try 
        {
            const count = await this.categoryModel
                .countDocuments({ orgId, name })
                .exec();
            return count > 0;
        } 
        catch (error: any) 
        {
            this.logger.error(`Error checking category name existence: ${error.message}`, 'CategoryService#categoryExistsByName');
            throw new DatabaseOperationException('category name existence check', error.message);
        }
    }

    private async categoryExistsByNameExcluding(orgId: Types.ObjectId, name: string, excludeId: Types.ObjectId): Promise<boolean> 
    {
        try 
        {
            const count = await this.categoryModel
                .countDocuments({ 
                    orgId, 
                    name,
                    _id: { $ne: excludeId },
                })
                .exec();
            return count > 0;
        } 
        catch (error: any) 
        {
            this.logger.error(`Error checking category name existence excluding ID: ${error.message}`, 'CategoryService#categoryExistsByNameExcluding');
            throw new DatabaseOperationException('category name existence check with exclusion', error.message);
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
                throw new CategoryCircularReferenceException('Circular reference detected in category hierarchy');
            }

            if (currentParentId.equals(categoryId)) 
            {
                throw new CategoryCircularReferenceException('Circular reference detected: category cannot be a descendant of itself');
            }

            visited.add(currentParentIdStr);

            let parentCategory;
            try 
            {
                parentCategory = await this.categoryModel
                    .findById(currentParentId)
                    .exec();
            } 
            catch (error: any) 
            {
                this.logger.error(`Error checking circular reference: ${error.message}`, 'CategoryService#checkCircularReference');
                throw new DatabaseOperationException('circular reference check', error.message);
            }

            currentParentId = parentCategory?.parentId || null;
        }
    }
}
