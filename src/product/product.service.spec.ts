import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductService } from './product.service';
import { Product, ProductSchema } from './schemas/product.schema';
import { Category, CategorySchema } from '../category/schemas/category.schema';
import { CategoryService } from '../category/category.service';
import { InCreateProductDto } from './dto/in.create-product.dto';
import { InUpdateProductDto } from './dto/in.update-product.dto';
import { DatabaseTestHelper } from '../../test/utils/database.helper';

describe('ProductService - Service Tests (Unit-style)', () => 
{
    let service: ProductService;
    let connection: Connection;
    let module: TestingModule;
    let productModel: any;
    let categoryModel: any;

    const mockOrgId = new Types.ObjectId();
    const mockOrgId2 = new Types.ObjectId();
    const mockCategoryId = new Types.ObjectId();
    const mockCategoryId2 = new Types.ObjectId();

    const mockCreateProductDto: InCreateProductDto = {
        name: 'Vodka Premium',
        description: 'High quality vodka',
        brand: 'Premium Brand',
        defaultUnit: 'bottle',
        defaultPurchasePrice: 25.99,
        currentQuantity: 10,
        categoryIds: [],
        imageUrl: 'https://example.com/vodka.jpg',
    };

    const mockUpdateProductDto: InUpdateProductDto = {
        name: 'Vodka Supreme',
        description: 'Ultra premium vodka',
        defaultPurchasePrice: 35.99,
    };

    beforeAll(async () => 
    {
        module = await Test.createTestingModule({
            imports: [
                DatabaseTestHelper.getMongooseTestModule(),
                MongooseModule.forFeature([
                    { name: Product.name, schema: ProductSchema },
                    { name: Category.name, schema: CategorySchema },
                ]),
            ],
            providers: [ProductService, CategoryService],
        }).compile();

        service = module.get<ProductService>(ProductService);
        connection = module.get<Connection>(getConnectionToken());
        productModel = connection.model('Product');
        categoryModel = connection.model('Category');
    });

    beforeEach(async () => 
    {
        await DatabaseTestHelper.clearDatabase(connection);
    });

    afterAll(async () => 
    {
        await connection.close();
        await module.close();
        await DatabaseTestHelper.stopInMemoryDatabase();
    });

    describe('createProduct', () => 
    {
        it('should create a product successfully without categories', async () => 
        {
            // Act
            const result = await service.createProduct(mockOrgId, mockCreateProductDto);

            // Assert - Verify product is saved to database
            const savedProduct = await productModel.findById(result._id);
            expect(savedProduct).toBeTruthy();
            expect(savedProduct.name).toBe(mockCreateProductDto.name);
            expect(savedProduct.description).toBe(mockCreateProductDto.description);
            expect(savedProduct.brand).toBe(mockCreateProductDto.brand);
            expect(savedProduct.defaultUnit).toBe(mockCreateProductDto.defaultUnit);
            expect(savedProduct.defaultPurchasePrice).toBe(mockCreateProductDto.defaultPurchasePrice);
            expect(savedProduct.currentQuantity).toBe(mockCreateProductDto.currentQuantity);
            expect(savedProduct.orgId.toString()).toBe(mockOrgId.toString());
            expect(savedProduct.categoryIds).toEqual([]);
            expect(savedProduct.imageUrl).toBe(mockCreateProductDto.imageUrl);
        });

        it('should create a product with default quantity of 0 when not provided', async () => 
        {
            // Arrange
            const dtoWithoutQuantity = { ...mockCreateProductDto };
            delete dtoWithoutQuantity.currentQuantity;

            // Act
            const result = await service.createProduct(mockOrgId, dtoWithoutQuantity);

            // Assert - Verify default quantity is set
            const savedProduct = await productModel.findById(result._id);
            expect(savedProduct.currentQuantity).toBe(0);
        });

        it('should create a product with valid categories', async () => 
        {
            // Arrange - Create categories first
            const category1 = await categoryModel.create({
                name: 'Spirits',
                orgId: mockOrgId,
            });
            const category2 = await categoryModel.create({
                name: 'Premium',
                orgId: mockOrgId,
            });

            const dtoWithCategories = {
                ...mockCreateProductDto,
                categoryIds: [category1.id, category2.id],
            };

            // Act
            const result = await service.createProduct(mockOrgId, dtoWithCategories);

            // Assert - Verify categories are saved
            const savedProduct = await productModel.findById(result._id);
            expect(savedProduct.categoryIds).toHaveLength(2);
            expect(savedProduct.categoryIds.map((id: any) => id.toString())).toContain(category1.id);
            expect(savedProduct.categoryIds.map((id: any) => id.toString())).toContain(category2.id);
        });

        it('should throw BadRequestException when product name already exists in organization', async () => 
        {
            // Arrange - Create existing product
            await productModel.create({
                name: mockCreateProductDto.name,
                defaultUnit: 'bottle',
                orgId: mockOrgId,
                categoryIds: [],
            });

            // Act & Assert
            await expect(service.createProduct(mockOrgId, mockCreateProductDto))
                .rejects.toThrow(BadRequestException);
        });

        it('should allow same product name in different organizations', async () => 
        {
            // Arrange - Create product in first org
            await productModel.create({
                name: mockCreateProductDto.name,
                defaultUnit: 'bottle',
                orgId: mockOrgId,
                categoryIds: [],
            });

            // Act - Create product with same name in different org
            const result = await service.createProduct(mockOrgId2, mockCreateProductDto);

            // Assert - Verify product is created successfully
            const savedProduct = await productModel.findById(result._id);
            expect(savedProduct).toBeTruthy();
            expect(savedProduct.orgId.toString()).toBe(mockOrgId2.toString());
        });

        it('should throw BadRequestException when category does not exist', async () => 
        {
            // Arrange
            const nonExistentCategoryId = new Types.ObjectId().toString();
            const dtoWithInvalidCategory = {
                ...mockCreateProductDto,
                categoryIds: [nonExistentCategoryId],
            };

            // Act & Assert
            await expect(service.createProduct(mockOrgId, dtoWithInvalidCategory))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException when category belongs to different organization', async () => 
        {
            // Arrange - Create category in different org
            const categoryInDifferentOrg = await categoryModel.create({
                name: 'Spirits',
                orgId: mockOrgId2,
            });

            const dtoWithWrongOrgCategory = {
                ...mockCreateProductDto,
                categoryIds: [categoryInDifferentOrg.id],
            };

            // Act & Assert
            await expect(service.createProduct(mockOrgId, dtoWithWrongOrgCategory))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('findProductsByOrg', () => 
    {
        beforeEach(async () => 
        {
            // Create test products
            await productModel.create([
                {
                    name: 'Vodka',
                    defaultUnit: 'bottle',
                    orgId: mockOrgId,
                    categoryIds: [mockCategoryId],
                    currentQuantity: 5,
                },
                {
                    name: 'Whiskey',
                    defaultUnit: 'bottle',
                    orgId: mockOrgId,
                    categoryIds: [mockCategoryId2],
                    currentQuantity: 3,
                },
                {
                    name: 'Rum',
                    defaultUnit: 'bottle',
                    orgId: mockOrgId2,
                    categoryIds: [],
                    currentQuantity: 2,
                },
            ]);
        });

        it('should return all products for organization sorted by name', async () => 
        {
            // Act
            const result = await service.findProductsByOrg(mockOrgId);

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Vodka'); // Alphabetically first
            expect(result[1].name).toBe('Whiskey');
            expect(result.every(product => product.orgId.toString() === mockOrgId.toString())).toBe(true);
        });

        it('should return products filtered by category', async () => 
        {
            // Act
            const result = await service.findProductsByOrg(mockOrgId, mockCategoryId.toString());

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Vodka');
            expect(result[0].categoryIds.map(id => id.toString())).toContain(mockCategoryId.toString());
        });

        it('should return empty array when no products exist for organization', async () => 
        {
            // Arrange
            const emptyOrgId = new Types.ObjectId();

            // Act
            const result = await service.findProductsByOrg(emptyOrgId);

            // Assert
            expect(result).toHaveLength(0);
        });

        it('should return empty array when filtering by non-existent category', async () => 
        {
            // Arrange
            const nonExistentCategoryId = new Types.ObjectId().toString();

            // Act
            const result = await service.findProductsByOrg(mockOrgId, nonExistentCategoryId);

            // Assert
            expect(result).toHaveLength(0);
        });
    });

    describe('findProductById', () => 
    {
        let savedProduct: any;

        beforeEach(async () => 
        {
            savedProduct = await productModel.create({
                name: 'Test Product',
                defaultUnit: 'bottle',
                orgId: mockOrgId,
                categoryIds: [],
                currentQuantity: 1,
            });
        });

        it('should return product when found', async () => 
        {
            // Act
            const result = await service.findProductById(mockOrgId, savedProduct._id);

            // Assert
            expect(result).toBeTruthy();
            expect(result.id).toBe(savedProduct.id);
            expect(result.name).toBe('Test Product');
            expect(result.orgId.toString()).toBe(mockOrgId.toString());
        });

        it('should throw NotFoundException when product does not exist', async () => 
        {
            // Arrange
            const nonExistentId = new Types.ObjectId();

            // Act & Assert
            await expect(service.findProductById(mockOrgId, nonExistentId))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException when product belongs to different organization', async () => 
        {
            // Act & Assert
            await expect(service.findProductById(mockOrgId2, savedProduct._id))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('updateProduct', () => 
    {
        let savedProduct: any;
        let validCategory: any;

        beforeEach(async () => 
        {
            savedProduct = await productModel.create({
                name: 'Original Product',
                defaultUnit: 'bottle',
                orgId: mockOrgId,
                categoryIds: [],
                currentQuantity: 10,
                defaultPurchasePrice: 20.00,
            });

            validCategory = await categoryModel.create({
                name: 'Test Category',
                orgId: mockOrgId,
            });
        });

        it('should update product successfully', async () => 
        {
            // Act
            await service.updateProduct(mockOrgId, savedProduct._id, mockUpdateProductDto);

            // Assert - Verify database state
            const updatedProduct = await productModel.findById(savedProduct._id);
            expect(updatedProduct.name).toBe(mockUpdateProductDto.name);
            expect(updatedProduct.description).toBe(mockUpdateProductDto.description);
            expect(updatedProduct.defaultPurchasePrice).toBe(mockUpdateProductDto.defaultPurchasePrice);
        });

        it('should update product categories', async () => 
        {
            // Arrange
            const updateWithCategories = {
                name: 'Updated Product',
                categoryIds: [validCategory.id],
            };

            // Act
            await service.updateProduct(mockOrgId, savedProduct._id, updateWithCategories);

            // Assert - Verify categories are updated in database
            const updatedProduct = await productModel.findById(savedProduct._id);
            expect(updatedProduct.categoryIds).toHaveLength(1);
            expect(updatedProduct.categoryIds[0].toString()).toBe(validCategory.id);
        });

        it('should throw NotFoundException when product does not exist', async () => 
        {
            // Arrange
            const nonExistentId = new Types.ObjectId();

            // Act & Assert
            await expect(service.updateProduct(mockOrgId, nonExistentId, mockUpdateProductDto))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException when product belongs to different organization', async () => 
        {
            // Act & Assert
            await expect(service.updateProduct(mockOrgId2, savedProduct._id, mockUpdateProductDto))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException when updating to existing product name in same organization', async () => 
        {
            // Arrange - Create another product with different name
            await productModel.create({
                name: 'Existing Product',
                defaultUnit: 'bottle',
                orgId: mockOrgId,
                categoryIds: [],
                currentQuantity: 5,
            });

            const updateToExistingName = {
                name: 'Existing Product',
            };

            // Act & Assert
            await expect(service.updateProduct(mockOrgId, savedProduct._id, updateToExistingName))
                .rejects.toThrow(BadRequestException);
        });

        it('should allow updating to same name (no change)', async () => 
        {
            // Arrange
            const updateToSameName = {
                name: savedProduct.name,
            };

            // Act
            const result = await service.updateProduct(mockOrgId, savedProduct._id, updateToSameName);

            // Assert
            expect(result.name).toBe(savedProduct.name);
        });

        it('should throw BadRequestException when category does not exist', async () => 
        {
            // Arrange
            const nonExistentCategoryId = new Types.ObjectId().toString();
            const updateWithInvalidCategory = {
                categoryIds: [nonExistentCategoryId],
            };

            // Act & Assert
            await expect(service.updateProduct(mockOrgId, savedProduct._id, updateWithInvalidCategory))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException when category belongs to different organization', async () => 
        {
            // Arrange - Create category in different org
            const categoryInDifferentOrg = await categoryModel.create({
                name: 'Different Org Category',
                orgId: mockOrgId2,
            });

            const updateWithWrongOrgCategory = {
                categoryIds: [categoryInDifferentOrg.id],
            };

            // Act & Assert
            await expect(service.updateProduct(mockOrgId, savedProduct._id, updateWithWrongOrgCategory))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('deleteProduct', () => 
    {
        let savedProduct: any;

        beforeEach(async () => 
        {
            savedProduct = await productModel.create({
                name: 'Product to Delete',
                defaultUnit: 'bottle',
                orgId: mockOrgId,
                categoryIds: [],
                currentQuantity: 5,
            });
        });

        it('should delete product successfully', async () => 
        {
            // Act
            await service.deleteProduct(mockOrgId, savedProduct._id);

            // Assert - Verify product is removed from database
            const deletedProduct = await productModel.findById(savedProduct._id);
            expect(deletedProduct).toBeNull();
        });

        it('should throw NotFoundException when product does not exist', async () => 
        {
            // Arrange
            const nonExistentId = new Types.ObjectId();

            // Act & Assert
            await expect(service.deleteProduct(mockOrgId, nonExistentId))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException when product belongs to different organization', async () => 
        {
            // Act & Assert
            await expect(service.deleteProduct(mockOrgId2, savedProduct._id))
                .rejects.toThrow(NotFoundException);
        });

        it('should not affect products in other organizations', async () => 
        {
            // Arrange - Create product in different org
            const productInDifferentOrg = await productModel.create({
                name: 'Other Org Product',
                defaultUnit: 'bottle',
                orgId: mockOrgId2,
                categoryIds: [],
                currentQuantity: 3,
            });

            // Act
            await service.deleteProduct(mockOrgId, savedProduct._id);

            // Assert - Verify other org's product is not affected
            const otherOrgProduct = await productModel.findById(productInDifferentOrg._id);
            expect(otherOrgProduct).toBeTruthy();
        });
    });
});
