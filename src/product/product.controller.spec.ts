import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as request from 'supertest';
import { Types } from 'mongoose';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { InventoryService } from './inventory.service';
import { CategoryService } from '../category/category.service';
import { Product, ProductSchema } from './schemas/product.schema';
import { InventoryLog, InventoryLogSchema, InventoryLogType } from './schemas/inventory-log.schema';
import { Category, CategorySchema } from '../category/schemas/category.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRolesGuard } from '../org/guards/org-roles.guard';
import { ObjectIdValidationPipe } from '../pipes/object-id-validation.pipe';
import { InCreateProductDto } from './dto/in.create-product.dto';
import { InUpdateProductDto } from './dto/in.update-product.dto';
import { InStockAdjustmentDto } from './dto/in.stock-adjustment.dto';
import { CustomLogger } from '../common/logger/custom.logger';

describe('ProductController (Integration)', () =>
{
    let app: INestApplication;
    let mongoServer: MongoMemoryServer;
    let productService: ProductService;
    let mockLogger: jest.Mocked<CustomLogger>;

    const mockOrgId = new Types.ObjectId();
    const mockOrgId2 = new Types.ObjectId();
    const mockUserId = new Types.ObjectId();

    const mockUser = {
        _id: mockUserId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
    };

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
                MongooseModule.forFeature([
                    { name: Product.name, schema: ProductSchema },
                    { name: InventoryLog.name, schema: InventoryLogSchema },
                    { name: Category.name, schema: CategorySchema },
                ]),
            ],
            controllers: [ProductController],
            providers: [
                ProductService, 
                InventoryService, 
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
                canActivate: (context: any) =>
                {
                    const request = context.switchToHttp().getRequest();
                    request.user = mockUser; // Provide mock user
                    return true;
                },
            })
            .overrideGuard(OrgRolesGuard)
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

        await app.init();
        productService = moduleFixture.get<ProductService>(ProductService);
    });

    afterAll(async () =>
    {
        await app.close();
        await mongoServer.stop();
    });

    beforeEach(async () =>
    {
        // Clear database before each test
        const connection = app.get('DatabaseConnection');
        if (connection?.db) 
        {
            const collections = await connection.db.collections();
            for (const collection of collections) 
            {
                await collection.deleteMany({});
            }
        }
    });

    describe('GET /orgs/:orgId/products', () =>
    {
        beforeEach(async () =>
        {
            // Create test products
            await productService.createProduct(mockOrgId, {
                name: 'Vodka Premium',
                defaultUnit: 'bottle',
                currentQuantity: 10,
            });
            await productService.createProduct(mockOrgId, {
                name: 'Whiskey Gold',
                defaultUnit: 'bottle',
                currentQuantity: 5,
            });
            await productService.createProduct(mockOrgId2, {
                name: 'Rum Silver',
                defaultUnit: 'bottle',
                currentQuantity: 3,
            });
        });

        it('should return products for organization', async () =>
        {
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/products`)
                .expect(200);

            expect(response.body).toHaveLength(2);
            expect(response.body[0].name).toBe('Vodka Premium'); // Alphabetically first
            expect(response.body[1].name).toBe('Whiskey Gold');
            // Note: orgId is not exposed in OutProductDto for security reasons
        });

        it('should return empty array when no products exist', async () =>
        {
            const emptyOrgId = new Types.ObjectId();
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${emptyOrgId}/products`)
                .expect(200);

            expect(response.body).toHaveLength(0);
        });

        it('should filter products by category when categoryId is provided', async () =>
        {
            // This test assumes category filtering is implemented
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/products?categoryId=${new Types.ObjectId()}`)
                .expect(200);

            expect(response.body).toHaveLength(0); // No products with this category
        });

        it('should return 400 for invalid orgId', async () =>
        {
            await request(app.getHttpServer())
                .get('/api/orgs/invalid-id/products')
                .expect(400);
        });
    });

    describe('GET /orgs/:orgId/products/:id', () =>
    {
        let savedProduct: any;

        beforeEach(async () =>
        {
            savedProduct = await productService.createProduct(mockOrgId, {
                name: 'Test Product',
                defaultUnit: 'bottle',
                currentQuantity: 1,
            });
        });

        it('should return product by id', async () =>
        {
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/products/${savedProduct.id}`)
                .expect(200);

            expect(response.body.name).toBe('Test Product');
            expect(response.body).toHaveProperty('id');
            // Note: orgId is not exposed in OutProductDto for security reasons
        });

        it('should return 404 when product not found', async () =>
        {
            const nonExistentId = new Types.ObjectId();
            await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/products/${nonExistentId}`)
                .expect(404);
        });

        it('should return 404 when product belongs to different organization', async () =>
        {
            await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId2}/products/${savedProduct.id}`)
                .expect(404);
        });

        it('should return 400 for invalid productId', async () =>
        {
            await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/products/invalid-id`)
                .expect(400);
        });
    });

    describe('POST /orgs/:orgId/products', () =>
    {
        const validCreateDto: InCreateProductDto = {
            name: 'New Product',
            defaultUnit: 'bottle',
            description: 'A new test product',
            brand: 'Test Brand',
            defaultPurchasePrice: 29.99,
            currentQuantity: 15,
        };

        it('should create a new product successfully', async () =>
        {
            const response = await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products`)
                .send(validCreateDto)
                .expect(201);

            expect(response.body.name).toBe(validCreateDto.name);
            expect(response.body.defaultUnit).toBe(validCreateDto.defaultUnit);
            expect(response.body.description).toBe(validCreateDto.description);
            expect(response.body.brand).toBe(validCreateDto.brand);
            expect(response.body.defaultPurchasePrice).toBe(validCreateDto.defaultPurchasePrice);
            expect(response.body.currentQuantity).toBe(validCreateDto.currentQuantity);
            expect(response.body).toHaveProperty('id');

            // Verify product is persisted
            const createdProduct = await productService.findProductById(mockOrgId, new Types.ObjectId(response.body.id));
            expect(createdProduct.name).toBe(validCreateDto.name);
        });

        it('should create product with minimal required fields', async () =>
        {
            const minimalDto = {
                name: 'Minimal Product',
                defaultUnit: 'bottle',
            };

            const response = await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products`)
                .send(minimalDto)
                .expect(201);

            expect(response.body.name).toBe(minimalDto.name);
            expect(response.body.defaultUnit).toBe(minimalDto.defaultUnit);
            expect(response.body.currentQuantity).toBe(0); // Default value
        });

        it('should return 400 for missing required fields', async () =>
        {
            const invalidDto = {
                description: 'Missing required fields',
            };

            await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products`)
                .send(invalidDto)
                .expect(400);
        });

        it('should return 400 for invalid field types', async () =>
        {
            const invalidDto = {
                ...validCreateDto,
                defaultPurchasePrice: 'invalid-price', // Should be number
            };

            await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products`)
                .send(invalidDto)
                .expect(400);
        });

        it('should return 400 for negative quantity', async () =>
        {
            const invalidDto = {
                ...validCreateDto,
                currentQuantity: -5,
            };

            await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products`)
                .send(invalidDto)
                .expect(400);
        });

        it('should return 400 for negative price', async () =>
        {
            const invalidDto = {
                ...validCreateDto,
                defaultPurchasePrice: -10.99,
            };

            await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products`)
                .send(invalidDto)
                .expect(400);
        });

        it('should return 400 when product name already exists in organization', async () =>
        {
            // Create first product
            await productService.createProduct(mockOrgId, validCreateDto);

            // Try to create another with same name
            await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products`)
                .send(validCreateDto)
                .expect(400);
        });

        it('should allow same product name in different organizations', async () =>
        {
            // Create product in first org
            await productService.createProduct(mockOrgId, validCreateDto);

            // Create product with same name in different org
            const response = await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId2}/products`)
                .send(validCreateDto)
                .expect(201);

            expect(response.body.name).toBe(validCreateDto.name);
            expect(response.body).toHaveProperty('id');
            // Note: orgId is not exposed in OutProductDto for security reasons
        });

        it('should return 400 for invalid orgId', async () =>
        {
            await request(app.getHttpServer())
                .post('/api/orgs/invalid-id/products')
                .send(validCreateDto)
                .expect(400);
        });
    });

    describe('PUT /orgs/:orgId/products/:id', () =>
    {
        let savedProduct: any;

        const validUpdateDto: InUpdateProductDto = {
            name: 'Updated Product',
            description: 'Updated description',
            defaultPurchasePrice: 39.99,
        };

        beforeEach(async () =>
        {
            savedProduct = await productService.createProduct(mockOrgId, {
                name: 'Original Product',
                defaultUnit: 'bottle',
                currentQuantity: 10,
            });
        });

        it('should update product successfully', async () =>
        {
            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${mockOrgId}/products/${savedProduct.id}`)
                .send(validUpdateDto)
                .expect(200);

            expect(response.body.name).toBe(validUpdateDto.name);
            expect(response.body.description).toBe(validUpdateDto.description);
            expect(response.body.defaultPurchasePrice).toBe(validUpdateDto.defaultPurchasePrice);

            // Verify product is updated in database
            const updatedProduct = await productService.findProductById(mockOrgId, savedProduct._id);
            expect(updatedProduct.name).toBe(validUpdateDto.name);
        });

        it('should update only provided fields', async () =>
        {
            const partialUpdate = {
                description: 'Only description updated',
            };

            const response = await request(app.getHttpServer())
                .put(`/api/orgs/${mockOrgId}/products/${savedProduct.id}`)
                .send(partialUpdate)
                .expect(200);

            expect(response.body.name).toBe('Original Product'); // Unchanged
            expect(response.body.description).toBe(partialUpdate.description);
        });

        it('should return 404 when product not found', async () =>
        {
            const nonExistentId = new Types.ObjectId();
            await request(app.getHttpServer())
                .put(`/api/orgs/${mockOrgId}/products/${nonExistentId}`)
                .send(validUpdateDto)
                .expect(404);
        });

        it('should return 404 when product belongs to different organization', async () =>
        {
            await request(app.getHttpServer())
                .put(`/api/orgs/${mockOrgId2}/products/${savedProduct.id}`)
                .send(validUpdateDto)
                .expect(404);
        });

        it('should return 400 for invalid field types', async () =>
        {
            const invalidDto = {
                defaultPurchasePrice: 'invalid-price',
            };

            await request(app.getHttpServer())
                .put(`/api/orgs/${mockOrgId}/products/${savedProduct.id}`)
                .send(invalidDto)
                .expect(400);
        });

        it('should return 400 when updating to existing product name', async () =>
        {
            // Create another product
            await productService.createProduct(mockOrgId, {
                name: 'Existing Product',
                defaultUnit: 'bottle',
            });

            const updateToExistingName = {
                name: 'Existing Product',
            };

            await request(app.getHttpServer())
                .put(`/api/orgs/${mockOrgId}/products/${savedProduct.id}`)
                .send(updateToExistingName)
                .expect(400);
        });

        it('should return 400 for invalid productId', async () =>
        {
            await request(app.getHttpServer())
                .put(`/api/orgs/${mockOrgId}/products/invalid-id`)
                .send(validUpdateDto)
                .expect(400);
        });

        it('should return 400 for invalid orgId', async () =>
        {
            await request(app.getHttpServer())
                .put(`/api/orgs/invalid-id/products/${savedProduct.id}`)
                .send(validUpdateDto)
                .expect(400);
        });
    });

    describe('DELETE /orgs/:orgId/products/:id', () =>
    {
        let savedProduct: any;

        beforeEach(async () =>
        {
            savedProduct = await productService.createProduct(mockOrgId, {
                name: 'Product to Delete',
                defaultUnit: 'bottle',
                currentQuantity: 5,
            });
        });

        it('should delete product successfully', async () =>
        {
            const response = await request(app.getHttpServer())
                .delete(`/api/orgs/${mockOrgId}/products/${savedProduct.id}`)
                .expect(200);

            expect(response.body.message).toBe('Product deleted successfully');

            // Verify product is deleted
            await expect(productService.findProductById(mockOrgId, savedProduct._id))
                .rejects.toThrow();
        });

        it('should return 404 when product not found', async () =>
        {
            const nonExistentId = new Types.ObjectId();
            await request(app.getHttpServer())
                .delete(`/api/orgs/${mockOrgId}/products/${nonExistentId}`)
                .expect(404);
        });

        it('should return 404 when product belongs to different organization', async () =>
        {
            await request(app.getHttpServer())
                .delete(`/api/orgs/${mockOrgId2}/products/${savedProduct.id}`)
                .expect(404);
        });

        it('should return 400 for invalid productId', async () =>
        {
            await request(app.getHttpServer())
                .delete(`/api/orgs/${mockOrgId}/products/invalid-id`)
                .expect(400);
        });

        it('should return 400 for invalid orgId', async () =>
        {
            await request(app.getHttpServer())
                .delete(`/api/orgs/invalid-id/products/${savedProduct.id}`)
                .expect(400);
        });

        it('should not affect products in other organizations', async () =>
        {
            // Create product in different org
            const otherOrgProduct = await productService.createProduct(mockOrgId2, {
                name: 'Other Org Product',
                defaultUnit: 'bottle',
            });

            // Delete product in first org
            await request(app.getHttpServer())
                .delete(`/api/orgs/${mockOrgId}/products/${savedProduct.id}`)
                .expect(200);

            // Verify other org's product is not affected
            const stillExists = await productService.findProductById(mockOrgId2, otherOrgProduct._id as Types.ObjectId);
            expect(stillExists).toBeTruthy();
        });
    });

    // ===== INVENTORY ENDPOINT TESTS =====

    describe('POST /orgs/:orgId/products/:id/adjust-stock', () =>
    {
        let testProduct: any;

        beforeEach(async () =>
        {
            // Create a test product for inventory tests
            testProduct = await productService.createProduct(mockOrgId, {
                name: 'Test Inventory Product',
                defaultUnit: 'bottle',
                currentQuantity: 10,
            });
        });

        it('should adjust stock successfully and return inventory log', async () =>
        {
            // Arrange
            const adjustmentDto: InStockAdjustmentDto = {
                type: InventoryLogType.ADJUSTMENT,
                quantity: 5,
                note: 'Manual adjustment',
            };

            // Act
            const response = await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products/${testProduct.id}/adjust-stock`)
                .send(adjustmentDto)
                .expect(201);

            // Assert - Response structure
            expect(response.body).toHaveProperty('id');
            expect(response.body.orgId).toBe(mockOrgId.toString());
            expect(response.body.productId).toBe(testProduct.id);
            expect(response.body.type).toBe(InventoryLogType.ADJUSTMENT);
            expect(response.body.quantity).toBe(5);
            expect(response.body.previousQuantity).toBe(10);
            expect(response.body.newQuantity).toBe(15);
            expect(response.body.note).toBe('Manual adjustment');
            expect(response.body).toHaveProperty('createdAt');

            // Assert - Product quantity updated in database
            const updatedProduct = await productService.findProductById(mockOrgId, testProduct._id);
            expect(updatedProduct?.currentQuantity).toBe(15);
        });

        it('should handle negative quantity adjustments', async () =>
        {
            // Arrange
            const adjustmentDto: InStockAdjustmentDto = {
                type: InventoryLogType.CONSUMPTION,
                quantity: -3,
                note: 'Product consumed',
            };

            // Act
            const response = await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products/${testProduct.id}/adjust-stock`)
                .send(adjustmentDto)
                .expect(201);

            // Assert
            expect(response.body.quantity).toBe(-3);
            expect(response.body.previousQuantity).toBe(10);
            expect(response.body.newQuantity).toBe(7);
            expect(response.body.type).toBe(InventoryLogType.CONSUMPTION);

            // Assert - Product quantity updated
            const updatedProduct = await productService.findProductById(mockOrgId, testProduct._id);
            expect(updatedProduct?.currentQuantity).toBe(7);
        });

        it('should handle purchase type adjustments', async () =>
        {
            // Arrange
            const purchaseDto: InStockAdjustmentDto = {
                type: InventoryLogType.PURCHASE,
                quantity: 20,
                note: 'New stock delivery',
            };

            // Act
            const response = await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products/${testProduct.id}/adjust-stock`)
                .send(purchaseDto)
                .expect(201);

            // Assert
            expect(response.body.type).toBe(InventoryLogType.PURCHASE);
            expect(response.body.quantity).toBe(20);
            expect(response.body.newQuantity).toBe(30);
            expect(response.body.note).toBe('New stock delivery');
        });

        it('should handle adjustments without note', async () =>
        {
            // Arrange
            const adjustmentDto: InStockAdjustmentDto = {
                type: InventoryLogType.STOCKTAKE,
                quantity: 2,
            };

            // Act
            const response = await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products/${testProduct.id}/adjust-stock`)
                .send(adjustmentDto)
                .expect(201);

            // Assert
            expect(response.body.type).toBe(InventoryLogType.STOCKTAKE);
            expect(response.body.quantity).toBe(2);
            expect(response.body.note).toBeUndefined();
        });

        it('should return 400 when adjustment would result in negative quantity', async () =>
        {
            // Arrange
            const invalidAdjustment: InStockAdjustmentDto = {
                type: InventoryLogType.CONSUMPTION,
                quantity: -15, // More than current quantity of 10
                note: 'Invalid adjustment',
            };

            // Act & Assert
            const response = await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products/${testProduct.id}/adjust-stock`)
                .send(invalidAdjustment)
                .expect(400);

            expect(response.body.message).toContain('negative quantity');

            // Assert - Product quantity unchanged
            const unchangedProduct = await productService.findProductById(mockOrgId, testProduct._id);
            expect(unchangedProduct?.currentQuantity).toBe(10);
        });

        it('should return 404 when product does not exist', async () =>
        {
            // Arrange
            const nonExistentProductId = new Types.ObjectId();
            const adjustmentDto: InStockAdjustmentDto = {
                type: InventoryLogType.ADJUSTMENT,
                quantity: 5,
            };

            // Act & Assert
            await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products/${nonExistentProductId}/adjust-stock`)
                .send(adjustmentDto)
                .expect(404);
        });

        it('should return 404 when product belongs to different organization', async () =>
        {
            // Arrange
            const adjustmentDto: InStockAdjustmentDto = {
                type: InventoryLogType.ADJUSTMENT,
                quantity: 5,
            };

            // Act & Assert
            await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId2}/products/${testProduct.id}/adjust-stock`)
                .send(adjustmentDto)
                .expect(404);
        });

        it('should return 400 for invalid request body', async () =>
        {
            // Arrange - Missing required fields
            const invalidDto = {
                quantity: 5,
                // Missing type
            };

            // Act & Assert
            await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products/${testProduct.id}/adjust-stock`)
                .send(invalidDto)
                .expect(400);
        });

        it('should return 400 for invalid inventory log type', async () =>
        {
            // Arrange
            const invalidDto = {
                type: 'invalid_type',
                quantity: 5,
            };

            // Act & Assert
            await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products/${testProduct.id}/adjust-stock`)
                .send(invalidDto)
                .expect(400);
        });

        it('should return 400 for invalid quantity type', async () =>
        {
            // Arrange
            const invalidDto = {
                type: InventoryLogType.ADJUSTMENT,
                quantity: 'not_a_number',
            };

            // Act & Assert
            await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products/${testProduct.id}/adjust-stock`)
                .send(invalidDto)
                .expect(400);
        });

        it('should return 400 for invalid ObjectId format', async () =>
        {
            // Arrange
            const adjustmentDto: InStockAdjustmentDto = {
                type: InventoryLogType.ADJUSTMENT,
                quantity: 5,
            };

            // Act & Assert
            await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products/invalid-id/adjust-stock`)
                .send(adjustmentDto)
                .expect(400);
        });
    });

    describe('GET /orgs/:orgId/products/:id/logs', () =>
    {
        let testProduct: any;

        beforeEach(async () =>
        {
            // Create a test product
            testProduct = await productService.createProduct(mockOrgId, {
                name: 'Test Inventory Product',
                defaultUnit: 'bottle',
                currentQuantity: 10,
            });

            // Create multiple inventory logs
            // First adjustment
            await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products/${testProduct.id}/adjust-stock`)
                .send({
                    type: InventoryLogType.PURCHASE,
                    quantity: 10,
                    note: 'Initial stock',
                });

            // Second adjustment (simulate different time)
            await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products/${testProduct.id}/adjust-stock`)
                .send({
                    type: InventoryLogType.CONSUMPTION,
                    quantity: -2,
                    note: 'Product consumed',
                });

            // Third adjustment
            await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products/${testProduct.id}/adjust-stock`)
                .send({
                    type: InventoryLogType.ADJUSTMENT,
                    quantity: 3,
                    note: 'Manual adjustment',
                });
        });

        it('should return all inventory logs for a product', async () =>
        {
            // Act
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/products/${testProduct.id}/logs`)
                .expect(200);

            // Assert
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body).toHaveLength(3);

            // Assert - Logs are in descending order by date (most recent first)
            const logs = response.body;
            expect(logs[0].type).toBe(InventoryLogType.ADJUSTMENT); // Most recent
            expect(logs[1].type).toBe(InventoryLogType.CONSUMPTION);
            expect(logs[2].type).toBe(InventoryLogType.PURCHASE); // Oldest

            // Assert - Log structure
            logs.forEach((log: any) =>
            {
                expect(log).toHaveProperty('id');
                expect(log.orgId).toBe(mockOrgId.toString());
                expect(log.productId).toBe(testProduct.id);
                expect(log).toHaveProperty('userId');
                expect(log).toHaveProperty('type');
                expect(log).toHaveProperty('quantity');
                expect(log).toHaveProperty('previousQuantity');
                expect(log).toHaveProperty('newQuantity');
                expect(log).toHaveProperty('createdAt');
            });
        });

        it('should filter logs by start date', async () =>
        {
            // Arrange - Use a future date to filter out older logs
            const startDate = new Date(Date.now() - 60000).toISOString(); // 1 minute ago

            // Act
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/products/${testProduct.id}/logs?startDate=${startDate}`)
                .expect(200);

            // Assert - Should return recent logs
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThanOrEqual(0);
            
            // All returned logs should have createdAt >= startDate
            response.body.forEach((log: any) =>
            {
                expect(new Date(log.createdAt).getTime()).toBeGreaterThanOrEqual(new Date(startDate).getTime());
            });
        });

        it('should filter logs by end date', async () =>
        {
            // Arrange - Use a past date to filter out newer logs
            const endDate = new Date('2025-01-01T00:00:00Z').toISOString();

            // Act
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/products/${testProduct.id}/logs?endDate=${endDate}`)
                .expect(200);

            // Assert - Should return no logs (all our logs are more recent)
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body).toHaveLength(0);
        });

        it('should filter logs by date range', async () =>
        {
            // Arrange
            const startDate = new Date(Date.now() - 300000).toISOString(); // 5 minutes ago
            const endDate = new Date(Date.now() + 60000).toISOString(); // 1 minute from now

            // Act
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/products/${testProduct.id}/logs?startDate=${startDate}&endDate=${endDate}`)
                .expect(200);

            // Assert
            expect(response.body).toBeInstanceOf(Array);
            
            // All returned logs should be within the date range
            response.body.forEach((log: any) =>
            {
                const logDate = new Date(log.createdAt).getTime();
                expect(logDate).toBeGreaterThanOrEqual(new Date(startDate).getTime());
                expect(logDate).toBeLessThanOrEqual(new Date(endDate).getTime());
            });
        });

        it('should return empty array for product with no logs', async () =>
        {
            // Arrange - Create a new product without any logs
            const newProduct = await productService.createProduct(mockOrgId, {
                name: 'New Product',
                defaultUnit: 'bottle',
                currentQuantity: 0,
            });

            // Act
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/products/${newProduct.id}/logs`)
                .expect(200);

            // Assert
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body).toHaveLength(0);
        });

        it('should return 404 when product does not exist', async () =>
        {
            // Arrange
            const nonExistentProductId = new Types.ObjectId();

            // Act & Assert
            await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/products/${nonExistentProductId}/logs`)
                .expect(404);
        });

        it('should return 404 when product belongs to different organization', async () =>
        {
            // Act & Assert
            await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId2}/products/${testProduct.id}/logs`)
                .expect(404);
        });

        it('should return 400 for invalid ObjectId format', async () =>
        {
            // Act & Assert
            await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/products/invalid-id/logs`)
                .expect(400);
        });

        it('should handle invalid date format gracefully', async () =>
        {
            // Act
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/products/${testProduct.id}/logs?startDate=invalid-date`)
                .expect(200);

            // Assert - Should still return logs (invalid date ignored)
            expect(response.body).toBeInstanceOf(Array);
        });

        it('should not return logs from other products in same organization', async () =>
        {
            // Arrange - Create another product with logs
            const anotherProduct = await productService.createProduct(mockOrgId, {
                name: 'Another Product',
                defaultUnit: 'bottle',
                currentQuantity: 5,
            });

            await request(app.getHttpServer())
                .post(`/api/orgs/${mockOrgId}/products/${anotherProduct.id}/adjust-stock`)
                .send({
                    type: InventoryLogType.PURCHASE,
                    quantity: 5,
                    note: 'Different product stock',
                });

            // Act
            const response = await request(app.getHttpServer())
                .get(`/api/orgs/${mockOrgId}/products/${testProduct.id}/logs`)
                .expect(200);

            // Assert - Should only return logs for the specified product
            expect(response.body).toHaveLength(3); // Original 3 logs for testProduct
            response.body.forEach((log: any) =>
            {
                expect(log.productId).toBe(testProduct.id);
            });
        });
    });
});
