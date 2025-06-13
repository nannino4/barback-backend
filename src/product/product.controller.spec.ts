import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as request from 'supertest';
import { Types } from 'mongoose';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { CategoryService } from '../category/category.service';
import { Product, ProductSchema } from './schemas/product.schema';
import { Category, CategorySchema } from '../category/schemas/category.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRolesGuard } from '../org/guards/org-roles.guard';
import { ObjectIdValidationPipe } from '../pipes/object-id-validation.pipe';
import { InCreateProductDto } from './dto/in.create-product.dto';
import { InUpdateProductDto } from './dto/in.update-product.dto';

describe('ProductController (Integration)', () =>
{
    let app: INestApplication;
    let mongoServer: MongoMemoryServer;
    let productService: ProductService;

    const mockOrgId = new Types.ObjectId();
    const mockOrgId2 = new Types.ObjectId();

    beforeAll(async () =>
    {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                MongooseModule.forRoot(mongoUri),
                MongooseModule.forFeature([
                    { name: Product.name, schema: ProductSchema },
                    { name: Category.name, schema: CategorySchema },
                ]),
            ],
            controllers: [ProductController],
            providers: [ProductService, CategoryService, ObjectIdValidationPipe],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: () => true,
            })
            .overrideGuard(OrgRolesGuard)
            .useValue({
                canActivate: () => true,
            })
            .compile();

        app = moduleFixture.createNestApplication();
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
                .get(`/orgs/${mockOrgId}/products`)
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
                .get(`/orgs/${emptyOrgId}/products`)
                .expect(200);

            expect(response.body).toHaveLength(0);
        });

        it('should filter products by category when categoryId is provided', async () =>
        {
            // This test assumes category filtering is implemented
            const response = await request(app.getHttpServer())
                .get(`/orgs/${mockOrgId}/products?categoryId=${new Types.ObjectId()}`)
                .expect(200);

            expect(response.body).toHaveLength(0); // No products with this category
        });

        it('should return 400 for invalid orgId', async () =>
        {
            await request(app.getHttpServer())
                .get('/orgs/invalid-id/products')
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
                .get(`/orgs/${mockOrgId}/products/${savedProduct.id}`)
                .expect(200);

            expect(response.body.name).toBe('Test Product');
            expect(response.body).toHaveProperty('id');
            // Note: orgId is not exposed in OutProductDto for security reasons
        });

        it('should return 404 when product not found', async () =>
        {
            const nonExistentId = new Types.ObjectId();
            await request(app.getHttpServer())
                .get(`/orgs/${mockOrgId}/products/${nonExistentId}`)
                .expect(404);
        });

        it('should return 404 when product belongs to different organization', async () =>
        {
            await request(app.getHttpServer())
                .get(`/orgs/${mockOrgId2}/products/${savedProduct.id}`)
                .expect(404);
        });

        it('should return 400 for invalid productId', async () =>
        {
            await request(app.getHttpServer())
                .get(`/orgs/${mockOrgId}/products/invalid-id`)
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
                .post(`/orgs/${mockOrgId}/products`)
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
                .post(`/orgs/${mockOrgId}/products`)
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
                .post(`/orgs/${mockOrgId}/products`)
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
                .post(`/orgs/${mockOrgId}/products`)
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
                .post(`/orgs/${mockOrgId}/products`)
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
                .post(`/orgs/${mockOrgId}/products`)
                .send(invalidDto)
                .expect(400);
        });

        it('should return 400 when product name already exists in organization', async () =>
        {
            // Create first product
            await productService.createProduct(mockOrgId, validCreateDto);

            // Try to create another with same name
            await request(app.getHttpServer())
                .post(`/orgs/${mockOrgId}/products`)
                .send(validCreateDto)
                .expect(400);
        });

        it('should allow same product name in different organizations', async () =>
        {
            // Create product in first org
            await productService.createProduct(mockOrgId, validCreateDto);

            // Create product with same name in different org
            const response = await request(app.getHttpServer())
                .post(`/orgs/${mockOrgId2}/products`)
                .send(validCreateDto)
                .expect(201);

            expect(response.body.name).toBe(validCreateDto.name);
            expect(response.body).toHaveProperty('id');
            // Note: orgId is not exposed in OutProductDto for security reasons
        });

        it('should return 400 for invalid orgId', async () =>
        {
            await request(app.getHttpServer())
                .post('/orgs/invalid-id/products')
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
                .put(`/orgs/${mockOrgId}/products/${savedProduct.id}`)
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
                .put(`/orgs/${mockOrgId}/products/${savedProduct.id}`)
                .send(partialUpdate)
                .expect(200);

            expect(response.body.name).toBe('Original Product'); // Unchanged
            expect(response.body.description).toBe(partialUpdate.description);
        });

        it('should return 404 when product not found', async () =>
        {
            const nonExistentId = new Types.ObjectId();
            await request(app.getHttpServer())
                .put(`/orgs/${mockOrgId}/products/${nonExistentId}`)
                .send(validUpdateDto)
                .expect(404);
        });

        it('should return 404 when product belongs to different organization', async () =>
        {
            await request(app.getHttpServer())
                .put(`/orgs/${mockOrgId2}/products/${savedProduct.id}`)
                .send(validUpdateDto)
                .expect(404);
        });

        it('should return 400 for invalid field types', async () =>
        {
            const invalidDto = {
                defaultPurchasePrice: 'invalid-price',
            };

            await request(app.getHttpServer())
                .put(`/orgs/${mockOrgId}/products/${savedProduct.id}`)
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
                .put(`/orgs/${mockOrgId}/products/${savedProduct.id}`)
                .send(updateToExistingName)
                .expect(400);
        });

        it('should return 400 for invalid productId', async () =>
        {
            await request(app.getHttpServer())
                .put(`/orgs/${mockOrgId}/products/invalid-id`)
                .send(validUpdateDto)
                .expect(400);
        });

        it('should return 400 for invalid orgId', async () =>
        {
            await request(app.getHttpServer())
                .put(`/orgs/invalid-id/products/${savedProduct.id}`)
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
                .delete(`/orgs/${mockOrgId}/products/${savedProduct.id}`)
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
                .delete(`/orgs/${mockOrgId}/products/${nonExistentId}`)
                .expect(404);
        });

        it('should return 404 when product belongs to different organization', async () =>
        {
            await request(app.getHttpServer())
                .delete(`/orgs/${mockOrgId2}/products/${savedProduct.id}`)
                .expect(404);
        });

        it('should return 400 for invalid productId', async () =>
        {
            await request(app.getHttpServer())
                .delete(`/orgs/${mockOrgId}/products/invalid-id`)
                .expect(400);
        });

        it('should return 400 for invalid orgId', async () =>
        {
            await request(app.getHttpServer())
                .delete(`/orgs/invalid-id/products/${savedProduct.id}`)
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
                .delete(`/orgs/${mockOrgId}/products/${savedProduct.id}`)
                .expect(200);

            // Verify other org's product is not affected
            const stillExists = await productService.findProductById(mockOrgId2, otherOrgProduct._id as Types.ObjectId);
            expect(stillExists).toBeTruthy();
        });
    });
});
