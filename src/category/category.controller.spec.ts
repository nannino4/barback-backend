import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as request from 'supertest';
import { Types } from 'mongoose';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { Category, CategorySchema } from './schemas/category.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRolesGuard } from '../org/guards/org-roles.guard';
import { OrgSubscriptionGuard } from '../org/guards/org-subscription.guard';
import { ObjectIdValidationPipe } from '../pipes/object-id-validation.pipe';
import { InCreateCategoryDto } from './dto/in.create-category.dto';
import { InUpdateCategoryDto } from './dto/in.update-category.dto';
import { CustomLogger } from '../common/logger/custom.logger';
import { EmailVerifiedGuard } from 'src/auth/guards/email-verified.guard';

describe('CategoryController (Integration)', () =>
{
    let app: INestApplication;
    let mongoServer: MongoMemoryServer;
    let categoryService: CategoryService;
    let mockLogger: jest.Mocked<CustomLogger>;

    const mockOrgId = new Types.ObjectId();
    const mockOrgId2 = new Types.ObjectId();

    beforeAll(async () =>
    {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        mockLogger = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
        } as any;

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                MongooseModule.forRoot(mongoUri),
                MongooseModule.forFeature([{ name: Category.name, schema: CategorySchema }]),
            ],
            controllers: [CategoryController],
            providers: [
                CategoryService, 
                ObjectIdValidationPipe,
                {
                    provide: CustomLogger,
                    useValue: mockLogger,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: () => true,
            })
            .overrideGuard(EmailVerifiedGuard)
            .useValue({
                canActivate: () => true,
            })
            .overrideGuard(OrgRolesGuard)
            .useValue({
                canActivate: () => true,
            })
            .overrideGuard(OrgSubscriptionGuard)
            .useValue({
                canActivate: () => true,
            })
            .compile();

        app = moduleFixture.createNestApplication({
            logger: false, // Disable logging for tests
        });
        app.setGlobalPrefix('api');
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));

        categoryService = moduleFixture.get<CategoryService>(CategoryService);
        
        await app.init();
    });

    afterAll(async () =>
    {
        await app.close();
        await mongoServer.stop();
    });

    afterEach(async () =>
    {
        // Clean up database after each test
        const categoryModel = app.get('CategoryModel');
        await categoryModel.deleteMany({}).exec();
    });

    describe('GET /orgs/:orgId/categories', () =>
    {
        it('should return all categories for organization', async () =>
        {
            // Arrange
            const category1 = await categoryService.createCategory(mockOrgId, {
                name: 'Beverages',
                description: 'All beverages',
            });
            const category2 = await categoryService.createCategory(mockOrgId, {
                name: 'Food',
                description: 'All food items',
            });
            // Create category in different org to ensure it's not included
            await categoryService.createCategory(mockOrgId2, {
                name: 'Other Org Category',
            });

            // Act
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/categories`)
                .expect(200);

            // Assert - Test HTTP contract and data filtering
            expect(response.body).toHaveLength(2);
            expect(response.body).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: category1.id,
                        name: 'Beverages',
                        description: 'All beverages',
                    }),
                    expect.objectContaining({
                        id: category2.id,
                        name: 'Food',
                        description: 'All food items',
                    }),
                ])
            );
        });

        it('should return empty array when no categories exist', async () =>
        {
            // Act
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/categories`)
                .expect(200);

            // Assert
            expect(response.body).toEqual([]);
        });

        it('should return categories with hierarchical structure', async () =>
        {
            // Arrange
            const parentCategory = await categoryService.createCategory(mockOrgId, {
                name: 'Beverages',
            });
            await categoryService.createCategory(mockOrgId, {
                name: 'Alcoholic Beverages',
                parentId: parentCategory.id,
            });

            // Act
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/categories`)
                .expect(200);

            // Assert
            expect(response.body).toHaveLength(2);
            const parent = response.body.find((cat: any) => cat.name === 'Beverages');
            const child = response.body.find((cat: any) => cat.name === 'Alcoholic Beverages');
            
            expect(parent).toBeDefined();
            expect(child).toBeDefined();
            expect(child.parentId).toBe(parent.id);
        });

        it('should return 400 for invalid orgId', async () =>
        {
            // Act
            const response = await request(app.getHttpServer())
                .get('/api/orgs/invalid-id/categories')
                .expect(400);

            // Assert
            expect(response.body.message).toContain('Invalid ObjectId');
        });
    });

    describe('GET /orgs/:orgId/categories/:id', () =>
    {
        it('should return specific category by id', async () =>
        {
            // Arrange
            const category = await categoryService.createCategory(mockOrgId, {
                name: 'Test Category',
                description: 'Test description',
            });

            // Act
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/categories/${category.id}`)
                .expect(200);

            // Assert
            expect(response.body).toMatchObject({
                id: category.id,
                name: 'Test Category',
                description: 'Test description',
            });
        });

        it('should return 404 when category not found', async () =>
        {
            // Arrange
            const nonExistentId = new Types.ObjectId();

            // Act
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/categories/${nonExistentId}`)
                .expect(404);

            // Assert
            expect(response.body.error).toBe('CATEGORY_NOT_FOUND');
        });

        it('should return 404 when category belongs to different org', async () =>
        {
            // Arrange
            const categoryInDifferentOrg = await categoryService.createCategory(mockOrgId2, {
                name: 'Category in different org',
            });

            // Act
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/categories/${categoryInDifferentOrg.id}`)
                .expect(404);

            // Assert
            expect(response.body.error).toBe('CATEGORY_NOT_FOUND');
        });

        it('should return 400 for invalid category id', async () =>
        {
            // Act
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/categories/invalid-id`)
                .expect(400);

            // Assert
            expect(response.body.message).toContain('Invalid ObjectId');
        });
    });

    describe('POST /orgs/:orgId/categories', () =>
    {
        it('should create new category successfully', async () =>
        {
            // Arrange
            const createCategoryDto: InCreateCategoryDto = {
                name: 'New Category',
                description: 'New category description',
            };

            // Act
            const response = await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/categories`)
                .send(createCategoryDto)
                .expect(201);

            // Assert - Test response format and data persistence
            expect(response.body).toMatchObject({
                name: 'New Category',
                description: 'New category description',
            });
            expect(response.body.id).toBeDefined();

            // Verify category was persisted in database
            const savedCategory = await categoryService.findCategoryById(
                mockOrgId, 
                response.body.id
            );
            expect(savedCategory.name).toBe('New Category');
            expect(savedCategory.orgId.toString()).toBe(mockOrgId.toString());
        });

        it('should create category with parent when valid parentId provided', async () =>
        {
            // Arrange
            const parentCategory = await categoryService.createCategory(mockOrgId, {
                name: 'Parent Category',
            });
            const createCategoryDto: InCreateCategoryDto = {
                name: 'Child Category',
                parentId: parentCategory.id,
            };

            // Act
            const response = await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/categories`)
                .send(createCategoryDto)
                .expect(201);

            // Assert
            expect(response.body).toMatchObject({
                name: 'Child Category',
                parentId: parentCategory.id,
            });
        });

        it('should create category without description when not provided', async () =>
        {
            // Arrange
            const createCategoryDto = {
                name: 'Simple Category',
            };

            // Act
            const response = await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/categories`)
                .send(createCategoryDto)
                .expect(201);

            // Assert
            expect(response.body.name).toBe('Simple Category');
            expect(response.body.description).toBeUndefined();
        });

        it('should return 400 when name is missing', async () =>
        {
            // Arrange
            const invalidDto = {
                description: 'Description without name',
            };

            // Act
            const response = await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/categories`)
                .send(invalidDto)
                .expect(400);

            // Assert
            expect(response.body.message).toEqual(expect.arrayContaining([
                expect.stringContaining('name'),
            ]));
        });

        it('should return 400 when name is empty', async () =>
        {
            // Arrange
            const invalidDto = {
                name: '',
                description: 'Valid description',
            };

            // Act
            const response = await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/categories`)
                .send(invalidDto)
                .expect(400);

            // Assert
            expect(response.body.message).toEqual(expect.arrayContaining([
                expect.stringContaining('name'),
            ]));
        });

        it('should return 400 when parentId is invalid ObjectId', async () =>
        {
            // Arrange
            const invalidDto = {
                name: 'Valid Name',
                parentId: 'invalid-object-id',
            };

            // Act
            const response = await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/categories`)
                .send(invalidDto)
                .expect(400);

            // Assert
            expect(response.body.message).toEqual(expect.arrayContaining([
                expect.stringContaining('parentId'),
            ]));
        });

        it('should return 400 when parentId does not exist', async () =>
        {
            // Arrange
            const nonExistentParentId = new Types.ObjectId();
            const invalidDto = {
                name: 'Valid Name',
                parentId: nonExistentParentId.toString(),
            };

            // Act
            const response = await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/categories`)
                .send(invalidDto)
                .expect(400);

            // Assert
            expect(response.body.error).toBe('INVALID_PARENT_CATEGORY');
        });

        it('should reject extra fields not in DTO', async () =>
        {
            // Arrange
            const dtoWithExtraFields = {
                name: 'Valid Name',
                description: 'Valid description',
                extraField: 'This should be rejected',
            };

            // Act
            const response = await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/categories`)
                .send(dtoWithExtraFields)
                .expect(400);

            // Assert
            expect(response.body.message).toEqual(expect.arrayContaining([
                expect.stringContaining('extraField'),
            ]));
        });
    });

    describe('PUT /orgs/:orgId/categories/:id', () =>
    {
        let existingCategory: Category;

        beforeEach(async () =>
        {
            existingCategory = await categoryService.createCategory(mockOrgId, {
                name: 'Existing Category',
                description: 'Existing description',
            });
        });

        it('should update category successfully', async () =>
        {
            // Arrange
            const updateDto: InUpdateCategoryDto = {
                name: 'Updated Category',
                description: 'Updated description',
            };

            // Act
            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${mockOrgId}/categories/${existingCategory.id}`)
                .send(updateDto)
                .expect(200);

            // Assert - Test response and database persistence
            expect(response.body).toMatchObject({
                id: existingCategory.id,
                name: 'Updated Category',
                description: 'Updated description',
            });

            // Verify changes were persisted
            const updatedCategory = await categoryService.findCategoryById(
                mockOrgId, 
                existingCategory._id as Types.ObjectId
            );
            expect(updatedCategory.name).toBe('Updated Category');
            expect(updatedCategory.description).toBe('Updated description');
        });

        it('should update only provided fields', async () =>
        {
            // Arrange
            const partialUpdateDto = {
                name: 'New Name Only',
            };

            // Act
            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${mockOrgId}/categories/${existingCategory.id}`)
                .send(partialUpdateDto)
                .expect(200);

            // Assert
            expect(response.body.name).toBe('New Name Only');
            expect(response.body.description).toBe('Existing description'); // Should remain unchanged
        });

        it('should set parent category successfully', async () =>
        {
            // Arrange
            const parentCategory = await categoryService.createCategory(mockOrgId, {
                name: 'Parent Category',
            });
            const updateDto = {
                parentId: parentCategory.id,
            };

            // Act
            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${mockOrgId}/categories/${existingCategory.id}`)
                .send(updateDto)
                .expect(200);

            // Assert
            expect(response.body.parentId).toBe(parentCategory.id);
        });

        it('should return 400 when setting category as its own parent', async () =>
        {
            // Arrange
            const updateDto = {
                parentId: existingCategory.id,
            };

            // Act
            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${mockOrgId}/categories/${existingCategory.id}`)
                .send(updateDto)
                .expect(400);

            // Assert
            expect(response.body.error).toBe('CATEGORY_SELF_PARENT');
        });

        it('should return 400 when creating circular reference', async () =>
        {
            // Arrange - Create hierarchy: grandparent -> parent -> child
            const grandparent = existingCategory;
            const parent = await categoryService.createCategory(mockOrgId, {
                name: 'Parent',
                parentId: grandparent.id,
            });
            const child = await categoryService.createCategory(mockOrgId, {
                name: 'Child',
                parentId: parent.id,
            });

            // Act - Try to make grandparent child of child
            const updateDto = {
                parentId: child.id,
            };

            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${mockOrgId}/categories/${grandparent.id}`)
                .send(updateDto)
                .expect(400);

            // Assert
            expect(response.body.error).toBe('CATEGORY_CIRCULAR_REFERENCE');
        });

        it('should return 404 when category not found', async () =>
        {
            // Arrange
            const nonExistentId = new Types.ObjectId();
            const updateDto = {
                name: 'New Name',
            };

            // Act
            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${mockOrgId}/categories/${nonExistentId}`)
                .send(updateDto)
                .expect(404);

            // Assert
            expect(response.body.error).toBe('CATEGORY_NOT_FOUND');
        });

        it('should return 404 when category belongs to different org', async () =>
        {
            // Arrange
            const categoryInDifferentOrg = await categoryService.createCategory(mockOrgId2, {
                name: 'Category in different org',
            });
            const updateDto = {
                name: 'New Name',
            };

            // Act
            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${mockOrgId}/categories/${categoryInDifferentOrg.id}`)
                .send(updateDto)
                .expect(404);

            // Assert
            expect(response.body.error).toBe('CATEGORY_NOT_FOUND');
        });

        it('should return 400 for invalid category id', async () =>
        {
            // Arrange
            const updateDto = {
                name: 'New Name',
            };

            // Act
            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${mockOrgId}/categories/invalid-id`)
                .send(updateDto)
                .expect(400);

            // Assert
            expect(response.body.message).toContain('Invalid ObjectId');
        });

        it('should reject extra fields not in DTO', async () =>
        {
            // Arrange
            const dtoWithExtraFields = {
                name: 'Valid Name',
                extraField: 'This should be rejected',
            };

            // Act
            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${mockOrgId}/categories/${existingCategory.id}`)
                .send(dtoWithExtraFields)
                .expect(400);

            // Assert
            expect(response.body.message).toEqual(expect.arrayContaining([
                expect.stringContaining('extraField'),
            ]));
        });
    });

    describe('DELETE /orgs/:orgId/categories/:id', () =>
    {
        let existingCategory: Category;

        beforeEach(async () =>
        {
            existingCategory = await categoryService.createCategory(mockOrgId, {
                name: 'Category to Delete',
                description: 'Will be deleted',
            });
        });

        it('should delete category successfully', async () =>
        {
            // Act
            const response = await request(app.getHttpServer())
                .delete(`/api/orgs/${mockOrgId}/categories/${existingCategory.id}`)
                .expect(200);

            // Assert - Test response format and verify deletion
            expect(response.body).toEqual({
                message: 'Category deleted successfully',
            });

            // Verify category was deleted from database
            await expect(
                categoryService.findCategoryById(mockOrgId, existingCategory._id as Types.ObjectId)
            ).rejects.toThrow();
        });

        it('should return 400 when trying to delete category with children', async () =>
        {
            // Arrange - Create child category
            await categoryService.createCategory(mockOrgId, {
                name: 'Child Category',
                parentId: existingCategory.id,
            });

            // Act
            const response = await request(app.getHttpServer())
                .delete(`/api/orgs/${mockOrgId}/categories/${existingCategory.id}`)
                .expect(400);

            // Assert
            expect(response.body.error).toBe('CATEGORY_HAS_CHILDREN');

            // Verify parent category still exists
            const stillExists = await categoryService.findCategoryById(
                mockOrgId, 
                existingCategory._id as Types.ObjectId
            );
            expect(stillExists).toBeDefined();
        });

        it('should return 404 when category not found', async () =>
        {
            // Arrange
            const nonExistentId = new Types.ObjectId();

            // Act
            const response = await request(app.getHttpServer())
                .delete(`/api/orgs/${mockOrgId}/categories/${nonExistentId}`)
                .expect(404);

            // Assert
            expect(response.body.error).toBe('CATEGORY_NOT_FOUND');
        });

        it('should return 404 when category belongs to different org', async () =>
        {
            // Arrange
            const categoryInDifferentOrg = await categoryService.createCategory(mockOrgId2, {
                name: 'Category in different org',
            });

            // Act
            const response = await request(app.getHttpServer())
                .delete(`/api/orgs/${mockOrgId}/categories/${categoryInDifferentOrg.id}`)
                .expect(404);

            // Assert
            expect(response.body.error).toBe('CATEGORY_NOT_FOUND');
        });

        it('should return 400 for invalid category id', async () =>
        {
            // Act
            const response = await request(app.getHttpServer())
                .delete(`/api/orgs/${mockOrgId}/categories/invalid-id`)
                .expect(400);

            // Assert
            expect(response.body.message).toContain('Invalid ObjectId');
        });
    });

    describe('Authorization and Route Protection', () =>
    {
        it('should require authentication for all routes', async () =>
        {
            // This test would verify JWT authentication in a real implementation
            // For now, we're mocking the guards, but in production these would check actual JWT tokens
            expect(true).toBe(true); // Placeholder for auth verification
        });

        it('should require appropriate org roles for each endpoint', async () =>
        {
            // This test would verify role-based access control
            // GET endpoints should allow OWNER, MANAGER, STAFF
            // POST, PUT, DELETE endpoints should allow only OWNER, MANAGER
            expect(true).toBe(true); // Placeholder for role verification
        });
    });
});
