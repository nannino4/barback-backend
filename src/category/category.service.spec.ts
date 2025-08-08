import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { CategoryService } from './category.service';
import { Category, CategorySchema } from './schemas/category.schema';
import { InCreateCategoryDto } from './dto/in.create-category.dto';
import { InUpdateCategoryDto } from './dto/in.update-category.dto';
import { DatabaseTestHelper } from '../../test/utils/database.helper';
import { CustomLogger } from '../common/logger/custom.logger';
import { 
    CategoryNotFoundException, 
    CategoryNameConflictException,
    InvalidParentCategoryException,
    CategoryCircularReferenceException,
    CategorySelfParentException,
    CategoryHasChildrenException,
} from './exceptions/category.exceptions';

describe('CategoryService - Service Tests (Unit-style)', () => 
{
    let service: CategoryService;
    let connection: Connection;
    let module: TestingModule;
    let categoryModel: any;
    let mockLogger: jest.Mocked<CustomLogger>;

    const mockOrgId = new Types.ObjectId();
    const mockOrgId2 = new Types.ObjectId();

    const mockCreateCategoryDto: InCreateCategoryDto = {
        name: 'Beverages',
        description: 'All types of beverages',
    };

    const mockCreateSubCategoryDto: InCreateCategoryDto = {
        name: 'Alcoholic Beverages',
        description: 'Alcoholic drinks',
    };

    beforeAll(async () => 
    {
        mockLogger = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
        } as any;

        module = await Test.createTestingModule({
            imports: [
                DatabaseTestHelper.getMongooseTestModule(),
                MongooseModule.forFeature([{ name: Category.name, schema: CategorySchema }]),
            ],
            providers: [
                CategoryService,
                {
                    provide: CustomLogger,
                    useValue: mockLogger,
                },
            ],
        }).compile();

        service = module.get<CategoryService>(CategoryService);
        connection = module.get<Connection>(getConnectionToken());
        categoryModel = connection.model('Category');
    });

    beforeEach(async () => 
    {
        await DatabaseTestHelper.clearDatabase(connection);
    });

    afterAll(async () => 
    {
        await module.close();
        await DatabaseTestHelper.stopInMemoryDatabase();
    });

    it('should be defined', () => 
    {
        expect(service).toBeDefined();
    });

    describe('createCategory', () => 
    {
        it('should successfully create a new category', async () => 
        {
            // Act
            const result = await service.createCategory(mockOrgId, mockCreateCategoryDto);

            // Assert - Test the output and verify database state
            expect(result).toBeDefined();
            expect(result.name).toBe(mockCreateCategoryDto.name);
            expect(result.description).toBe(mockCreateCategoryDto.description);
            expect(result.orgId.toString()).toBe(mockOrgId.toString());
            expect(result.parentId).toBeUndefined();

            // Verify data was persisted correctly in database
            const savedCategory = await categoryModel.findById(result._id);
            expect(savedCategory).toBeDefined();
            expect(savedCategory.name).toBe(mockCreateCategoryDto.name);
            expect(savedCategory.orgId.toString()).toBe(mockOrgId.toString());
        });

        it('should create category with parent when valid parentId provided', async () => 
        {
            // Arrange - Create parent category first
            const parentCategory = await service.createCategory(mockOrgId, mockCreateCategoryDto);
            const subCategoryDto = {
                ...mockCreateSubCategoryDto,
                parentId: parentCategory.id,
            };

            // Act
            const result = await service.createCategory(mockOrgId, subCategoryDto);

            // Assert - Test the hierarchical relationship
            expect(result).toBeDefined();
            expect(result.name).toBe(subCategoryDto.name);
            expect(result.parentId!.toString()).toBe((parentCategory._id as Types.ObjectId).toString());
            expect(result.orgId.toString()).toBe(mockOrgId.toString());

            // Verify database state
            const savedSubCategory = await categoryModel.findById(result._id);
            expect(savedSubCategory.parentId.toString()).toBe((parentCategory._id as Types.ObjectId).toString());
        });

        it('should throw CategoryNameConflictException when category name already exists in organization', async () => 
        {
            // Arrange - Create first category
            await service.createCategory(mockOrgId, mockCreateCategoryDto);
            
            // Act & Assert - Try to create another category with same name
            await expect(service.createCategory(mockOrgId, mockCreateCategoryDto))
                .rejects
                .toThrow(CategoryNameConflictException);
        });

        it('should throw InvalidParentCategoryException when parentId does not exist', async () => 
        {
            // Arrange
            const nonExistentParentId = new Types.ObjectId();
            const categoryWithInvalidParent = {
                ...mockCreateCategoryDto,
                parentId: nonExistentParentId.toString(),
            };

            // Act & Assert
            await expect(service.createCategory(mockOrgId, categoryWithInvalidParent))
                .rejects
                .toThrow(InvalidParentCategoryException);
        });

        it('should throw InvalidParentCategoryException when parentId belongs to different org', async () => 
        {
            // Arrange - Create parent in different org
            const parentInDifferentOrg = await service.createCategory(mockOrgId2, mockCreateCategoryDto);
            const categoryWithWrongOrgParent = {
                ...mockCreateSubCategoryDto,
                parentId: parentInDifferentOrg.id,
            };

            // Act & Assert
            await expect(service.createCategory(mockOrgId, categoryWithWrongOrgParent))
                .rejects
                .toThrow(InvalidParentCategoryException);
        });

        it('should create category without description when not provided', async () => 
        {
            // Arrange
            const categoryWithoutDescription = {
                name: 'Simple Category',
            };

            // Act
            const result = await service.createCategory(mockOrgId, categoryWithoutDescription);

            // Assert
            expect(result).toBeDefined();
            expect(result.name).toBe(categoryWithoutDescription.name);
            expect(result.description).toBeUndefined();
        });
    });

    describe('findCategoriesByOrg', () => 
    {
        it('should return all categories for organization sorted by name', async () => 
        {
            // Arrange - Create multiple categories
            await service.createCategory(mockOrgId, { name: 'Zebra Category' });
            await service.createCategory(mockOrgId, { name: 'Alpha Category' });
            await service.createCategory(mockOrgId, { name: 'Beta Category' });
            // Create category in different org to ensure it's not included
            await service.createCategory(mockOrgId2, { name: 'Other Org Category' });

            // Act
            const result = await service.findCategoriesByOrg(mockOrgId);

            // Assert - Verify filtering and sorting
            expect(result).toHaveLength(3);
            expect(result[0].name).toBe('Alpha Category');
            expect(result[1].name).toBe('Beta Category');
            expect(result[2].name).toBe('Zebra Category');
            
            // Verify all belong to correct org
            result.forEach(category => 
            {
                expect(category.orgId.toString()).toBe(mockOrgId.toString());
            });
        });

        it('should return empty array when no categories exist for organization', async () => 
        {
            // Act
            const result = await service.findCategoriesByOrg(mockOrgId);

            // Assert
            expect(result).toEqual([]);
        });

        it('should return categories with hierarchical relationships', async () => 
        {
            // Arrange - Create parent and child categories
            const parentCategory = await service.createCategory(mockOrgId, mockCreateCategoryDto);
            const childCategory = await service.createCategory(mockOrgId, {
                ...mockCreateSubCategoryDto,
                parentId: parentCategory.id,
            });

            // Act
            const result = await service.findCategoriesByOrg(mockOrgId);

            // Assert
            expect(result).toHaveLength(2);
            
            const parent = result.find(cat => (cat._id as Types.ObjectId).toString() === (parentCategory._id as Types.ObjectId).toString());
            const child = result.find(cat => (cat._id as Types.ObjectId).toString() === (childCategory._id as Types.ObjectId).toString());
            
            expect(parent).toBeDefined();
            expect(child).toBeDefined();
            expect((child!.parentId as Types.ObjectId).toString()).toBe((parent!._id as Types.ObjectId).toString());
        });
    });

    describe('findCategoryById', () => 
    {
        it('should return category when found and belongs to org', async () => 
        {
            // Arrange
            const createdCategory = await service.createCategory(mockOrgId, mockCreateCategoryDto);

            // Act
            const result = await service.findCategoryById(mockOrgId, createdCategory._id as Types.ObjectId);

            // Assert
            expect(result).toBeDefined();
            expect((result._id as Types.ObjectId).toString()).toBe((createdCategory._id as Types.ObjectId).toString());
            expect(result.name).toBe(mockCreateCategoryDto.name);
            expect(result.orgId.toString()).toBe(mockOrgId.toString());
        });

        it('should throw CategoryNotFoundException when category does not exist', async () => 
        {
            // Arrange
            const nonExistentCategoryId = new Types.ObjectId();

            // Act & Assert
            await expect(service.findCategoryById(mockOrgId, nonExistentCategoryId))
                .rejects
                .toThrow(CategoryNotFoundException);
        });

        it('should throw CategoryNotFoundException when category belongs to different org', async () => 
        {
            // Arrange - Create category in one org
            const categoryInDifferentOrg = await service.createCategory(mockOrgId2, mockCreateCategoryDto);

            // Act & Assert
            await expect(service.findCategoryById(mockOrgId, categoryInDifferentOrg._id as Types.ObjectId))
                .rejects
                .toThrow(CategoryNotFoundException);
        });
    });

    describe('updateCategory', () => 
    {
        let existingCategory: Category;

        beforeEach(async () => 
        {
            existingCategory = await service.createCategory(mockOrgId, mockCreateCategoryDto);
        });

        it('should successfully update category name and description', async () => 
        {
            // Arrange
            const updateDto: InUpdateCategoryDto = {
                name: 'Updated Category Name',
                description: 'Updated description',
            };

            // Act
            const result = await service.updateCategory(mockOrgId, existingCategory._id as Types.ObjectId, updateDto);

            // Assert - Test the output and verify database state
            expect(result).toBeDefined();
            expect(result.name).toBe(updateDto.name);
            expect(result.description).toBe(updateDto.description);
            expect((result._id as Types.ObjectId).toString()).toBe((existingCategory._id as Types.ObjectId).toString());

            // Verify changes were persisted
            const updatedInDb = await categoryModel.findById(existingCategory._id);
            expect(updatedInDb.name).toBe(updateDto.name);
            expect(updatedInDb.description).toBe(updateDto.description);
        });

        it('should successfully update only name when description not provided', async () => 
        {
            // Arrange
            const updateDto: InUpdateCategoryDto = {
                name: 'New Name Only',
            };

            // Act
            const result = await service.updateCategory(mockOrgId, existingCategory._id as Types.ObjectId, updateDto);

            // Assert
            expect(result.name).toBe(updateDto.name);
            expect(result.description).toBe(existingCategory.description); // Should remain unchanged
        });

        it('should throw CategoryNameConflictException when updating to existing category name', async () => 
        {
            // Arrange - Create another category with different name
            await service.createCategory(mockOrgId, { name: 'Other Category' });
            const updateDto: InUpdateCategoryDto = {
                name: 'Other Category', // Try to use the other category's name
            };

            // Act & Assert
            await expect(service.updateCategory(mockOrgId, existingCategory._id as Types.ObjectId, updateDto))
                .rejects
                .toThrow(CategoryNameConflictException);
        });

        it('should successfully set parent category', async () => 
        {
            // Arrange
            const parentCategory = await service.createCategory(mockOrgId, { name: 'Parent Category' });
            const updateDto: InUpdateCategoryDto = {
                parentId: parentCategory.id,
            };

            // Act
            const result = await service.updateCategory(mockOrgId, existingCategory._id as Types.ObjectId, updateDto);

            // Assert
            expect(result.parentId.toString()).toBe(parentCategory.id);

            // Verify database state
            const updatedInDb = await categoryModel.findById(existingCategory._id);
            expect(updatedInDb.parentId.toString()).toBe(parentCategory.id);
        });

        it('should keep parent when parentId not provided in update', async () => 
        {
            // Arrange - First set a parent
            const parentCategory = await service.createCategory(mockOrgId, { name: 'Parent Category' });
            await service.updateCategory(mockOrgId, existingCategory._id as Types.ObjectId, { parentId: parentCategory.id });
            
            // Act - Update without parentId
            const result = await service.updateCategory(mockOrgId, existingCategory._id as Types.ObjectId, { name: 'Updated Name' });

            // Assert
            expect(result.parentId!.toString()).toBe((parentCategory._id as Types.ObjectId).toString());
        });

        it('should throw CategorySelfParentException when setting category as its own parent', async () => 
        {
            // Arrange
            const updateDto: InUpdateCategoryDto = {
                parentId: existingCategory.id,
            };

            // Act & Assert
            await expect(service.updateCategory(mockOrgId, existingCategory._id as Types.ObjectId, updateDto))
                .rejects
                .toThrow(CategorySelfParentException);
        });

        it('should throw InvalidParentCategoryException when parentId does not exist', async () => 
        {
            // Arrange
            const nonExistentParentId = new Types.ObjectId();
            const updateDto: InUpdateCategoryDto = {
                parentId: nonExistentParentId.toString(),
            };

            // Act & Assert
            await expect(service.updateCategory(mockOrgId, existingCategory._id as Types.ObjectId, updateDto))
                .rejects
                .toThrow(InvalidParentCategoryException);
        });

        it('should throw CategoryCircularReferenceException when creating circular reference', async () => 
        {            // Arrange - Create hierarchy: grandparent -> parent -> child
            const grandparent = await service.createCategory(mockOrgId, { name: 'Grandparent' });
            const parent = await service.createCategory(mockOrgId, { 
                name: 'Parent', 
                parentId: grandparent.id,
            });
            const child = await service.createCategory(mockOrgId, { 
                name: 'Child', 
                parentId: parent.id,
            });

            // Act & Assert - Try to make grandparent a child of child (circular reference)
            await expect(service.updateCategory(mockOrgId, grandparent._id as Types.ObjectId, { parentId: child.id }))
                .rejects
                .toThrow(CategoryCircularReferenceException);
        });

        it('should throw CategoryNotFoundException when category does not exist', async () => 
        {
            // Arrange
            const nonExistentId = new Types.ObjectId();
            const updateDto: InUpdateCategoryDto = { name: 'New Name' };

            // Act & Assert
            await expect(service.updateCategory(mockOrgId, nonExistentId, updateDto))
                .rejects
                .toThrow(CategoryNotFoundException);
        });

        it('should throw CategoryNotFoundException when category belongs to different org', async () => 
        {
            // Arrange
            const categoryInDifferentOrg = await service.createCategory(mockOrgId2, mockCreateCategoryDto);
            const updateDto: InUpdateCategoryDto = { name: 'New Name' };

            // Act & Assert
            await expect(service.updateCategory(mockOrgId, categoryInDifferentOrg._id as Types.ObjectId, updateDto))
                .rejects
                .toThrow(CategoryNotFoundException);
        });
    });

    describe('deleteCategory', () => 
    {
        let existingCategory: Category;

        beforeEach(async () => 
        {
            existingCategory = await service.createCategory(mockOrgId, mockCreateCategoryDto);
        });

        it('should successfully delete category without children', async () => 
        {
            // Act
            await service.deleteCategory(mockOrgId, existingCategory._id as Types.ObjectId);

            // Assert - Verify category was removed from database
            const deletedCategory = await categoryModel.findById(existingCategory._id);
            expect(deletedCategory).toBeNull();
        });

        it('should throw CategoryHasChildrenException when trying to delete category with children', async () => 
        {
            // Arrange - Create child category
            await service.createCategory(mockOrgId, {
                name: 'Child Category',
                parentId: existingCategory.id,
            });

            // Act & Assert
            await expect(service.deleteCategory(mockOrgId, existingCategory._id as Types.ObjectId))
                .rejects
                .toThrow(CategoryHasChildrenException);

            // Verify parent category still exists
            const parentStillExists = await categoryModel.findById(existingCategory._id);
            expect(parentStillExists).toBeDefined();
        });

        it('should allow deletion after children are removed', async () => 
        {
            // Arrange - Create and then delete child category
            const childCategory = await service.createCategory(mockOrgId, {
                name: 'Child Category',
                parentId: existingCategory.id,
            });
            await service.deleteCategory(mockOrgId, childCategory._id as Types.ObjectId);

            // Act
            await service.deleteCategory(mockOrgId, existingCategory._id as Types.ObjectId);

            // Assert
            const deletedCategory = await categoryModel.findById(existingCategory._id);
            expect(deletedCategory).toBeNull();
        });

        it('should throw CategoryNotFoundException when category does not exist', async () => 
        {
            // Arrange
            const nonExistentId = new Types.ObjectId();

            // Act & Assert
            await expect(service.deleteCategory(mockOrgId, nonExistentId))
                .rejects
                .toThrow(CategoryNotFoundException);
        });

        it('should throw CategoryNotFoundException when category belongs to different org', async () => 
        {
            // Arrange
            const categoryInDifferentOrg = await service.createCategory(mockOrgId2, mockCreateCategoryDto);

            // Act & Assert
            await expect(service.deleteCategory(mockOrgId, categoryInDifferentOrg._id as Types.ObjectId))
                .rejects
                .toThrow(CategoryNotFoundException);
        });

        it('should not affect categories in different organizations', async () => 
        {
            // Arrange
            const categoryInDifferentOrg = await service.createCategory(mockOrgId2, mockCreateCategoryDto);

            // Act
            await service.deleteCategory(mockOrgId, existingCategory._id as Types.ObjectId);

            // Assert - Category in different org should still exist
            const categoryInOtherOrg = await categoryModel.findById(categoryInDifferentOrg._id);
            expect(categoryInOtherOrg).toBeDefined();
        });
    });

    describe('private methods through integration', () => 
    {
        it('should prevent deep circular references', async () => 
        {
            // Arrange - Create deep hierarchy
            const level1 = await service.createCategory(mockOrgId, { name: 'Level 1' });            const level2 = await service.createCategory(mockOrgId, { 
                name: 'Level 2', 
                parentId: level1.id,
            });
            const level3 = await service.createCategory(mockOrgId, { 
                name: 'Level 3', 
                parentId: level2.id,
            });
            const level4 = await service.createCategory(mockOrgId, { 
                name: 'Level 4', 
                parentId: level3.id,
            });

            // Act & Assert - Try to create circular reference at different levels
            await expect(service.updateCategory(mockOrgId, level1._id as Types.ObjectId, { parentId: level4.id }))
                .rejects
                .toThrow(CategoryCircularReferenceException);

            await expect(service.updateCategory(mockOrgId, level2._id as Types.ObjectId, { parentId: level4.id }))
                .rejects
                .toThrow(CategoryCircularReferenceException);
        });
    });
});
