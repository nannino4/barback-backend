import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { InventoryService } from './inventory.service';
import { InventoryLog, InventoryLogSchema, InventoryLogType } from './schemas/inventory-log.schema';
import { Product, ProductSchema } from './schemas/product.schema';
import { InStockAdjustmentDto } from './dto/in.stock-adjustment.dto';
import { DatabaseTestHelper } from '../../test/utils/database.helper';
import { CustomLogger } from '../common/logger/custom.logger';
import { 
    ProductNotFoundException,
    NegativeStockException,
    ZeroStockAdjustmentException,
    InvalidDateRangeException,
} from './exceptions/product.exceptions';

describe('InventoryService - Service Tests (Unit-style)', () => 
{
    let service: InventoryService;
    let connection: Connection;
    let module: TestingModule;
    let productModel: any;
    let inventoryLogModel: any;
    let mockLogger: jest.Mocked<CustomLogger>;

    const mockOrgId = new Types.ObjectId();
    const mockOrgId2 = new Types.ObjectId();
    const mockProductId = new Types.ObjectId();
    const mockUserId = new Types.ObjectId();

    const mockProduct = {
        _id: mockProductId,
        orgId: mockOrgId,
        name: 'Test Product',
        defaultUnit: 'bottle',
        currentQuantity: 10,
        categoryIds: [],
    };

    const mockAdjustmentDto: InStockAdjustmentDto = {
        type: InventoryLogType.ADJUSTMENT,
        quantity: 5,
        note: 'Manual adjustment',
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
                MongooseModule.forFeature([
                    { name: InventoryLog.name, schema: InventoryLogSchema },
                    { name: Product.name, schema: ProductSchema },
                ]),
            ],
            providers: [
                InventoryService,
                {
                    provide: CustomLogger,
                    useValue: mockLogger,
                },
            ],
        }).compile();

        service = module.get<InventoryService>(InventoryService);
        connection = module.get<Connection>(getConnectionToken());
        productModel = connection.model('Product');
        inventoryLogModel = connection.model('InventoryLog');
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

    describe('adjustStock', () => 
    {
        beforeEach(async () => 
        {
            // Create a test product for each test
            await productModel.create(mockProduct);
        });

        it('should create inventory log and update product quantity for positive adjustment', async () => 
        {
            // Act
            const result = await service.adjustStock(
                mockOrgId, 
                mockProductId, 
                mockUserId, 
                mockAdjustmentDto
            );

            // Assert - Verify inventory log is created in database
            const savedLog = await inventoryLogModel.findById(result._id);
            expect(savedLog).toBeTruthy();
            expect(savedLog.orgId.toString()).toBe(mockOrgId.toString());
            expect(savedLog.productId.toString()).toBe(mockProductId.toString());
            expect(savedLog.userId.toString()).toBe(mockUserId.toString());
            expect(savedLog.type).toBe(InventoryLogType.ADJUSTMENT);
            expect(savedLog.quantity).toBe(5);
            expect(savedLog.previousQuantity).toBe(10);
            expect(savedLog.newQuantity).toBe(15);
            expect(savedLog.note).toBe('Manual adjustment');

            // Assert - Verify product quantity is updated in database
            const updatedProduct = await productModel.findById(mockProductId);
            expect(updatedProduct.currentQuantity).toBe(15);
        });

        it('should create inventory log and update product quantity for negative adjustment', async () => 
        {
            // Arrange
            const negativeAdjustmentDto: InStockAdjustmentDto = {
                type: InventoryLogType.CONSUMPTION,
                quantity: -3,
                note: 'Product consumed',
            };

            // Act
            const result = await service.adjustStock(
                mockOrgId, 
                mockProductId, 
                mockUserId, 
                negativeAdjustmentDto
            );

            // Assert - Verify inventory log is created in database
            const savedLog = await inventoryLogModel.findById(result._id);
            expect(savedLog).toBeTruthy();
            expect(savedLog.type).toBe(InventoryLogType.CONSUMPTION);
            expect(savedLog.quantity).toBe(-3);
            expect(savedLog.previousQuantity).toBe(10);
            expect(savedLog.newQuantity).toBe(7);

            // Assert - Verify product quantity is updated in database
            const updatedProduct = await productModel.findById(mockProductId);
            expect(updatedProduct.currentQuantity).toBe(7);
        });

        it('should handle stock adjustment without note', async () => 
        {
            // Arrange
            const adjustmentWithoutNote: InStockAdjustmentDto = {
                type: InventoryLogType.STOCKTAKE,
                quantity: 2,
            };

            // Act
            const result = await service.adjustStock(
                mockOrgId, 
                mockProductId, 
                mockUserId, 
                adjustmentWithoutNote
            );

            // Assert - Verify log is created without note
            const savedLog = await inventoryLogModel.findById(result._id);
            expect(savedLog).toBeTruthy();
            expect(savedLog.note).toBeUndefined();
            expect(savedLog.quantity).toBe(2);
            expect(savedLog.newQuantity).toBe(12);

            // Assert - Verify product quantity is updated
            const updatedProduct = await productModel.findById(mockProductId);
            expect(updatedProduct.currentQuantity).toBe(12);
        });

        it('should handle purchase type adjustment', async () => 
        {
            // Arrange
            const purchaseAdjustmentDto: InStockAdjustmentDto = {
                type: InventoryLogType.PURCHASE,
                quantity: 20,
                note: 'New stock arrived',
            };

            // Act
            const result = await service.adjustStock(
                mockOrgId, 
                mockProductId, 
                mockUserId, 
                purchaseAdjustmentDto
            );

            // Assert - Verify inventory log type and details
            const savedLog = await inventoryLogModel.findById(result._id);
            expect(savedLog.type).toBe(InventoryLogType.PURCHASE);
            expect(savedLog.quantity).toBe(20);
            expect(savedLog.previousQuantity).toBe(10);
            expect(savedLog.newQuantity).toBe(30);

            // Assert - Verify product quantity is updated
            const updatedProduct = await productModel.findById(mockProductId);
            expect(updatedProduct.currentQuantity).toBe(30);
        });

        it('should throw ProductNotFoundException when product does not exist', async () => 
        {
            // Arrange
            const nonExistentProductId = new Types.ObjectId();

            // Act & Assert
            await expect(service.adjustStock(
                mockOrgId, 
                nonExistentProductId, 
                mockUserId, 
                mockAdjustmentDto
            )).rejects.toThrow(ProductNotFoundException);

            // Assert - No logs should be created
            const logsCount = await inventoryLogModel.countDocuments({});
            expect(logsCount).toBe(0);
        });

        it('should throw ProductNotFoundException when product belongs to different organization', async () => 
        {
            // Act & Assert
            await expect(service.adjustStock(
                mockOrgId2, 
                mockProductId, 
                mockUserId, 
                mockAdjustmentDto
            )).rejects.toThrow(ProductNotFoundException);

            // Assert - Product quantity should remain unchanged
            const unchangedProduct = await productModel.findById(mockProductId);
            expect(unchangedProduct.currentQuantity).toBe(10);

            // Assert - No logs should be created
            const logsCount = await inventoryLogModel.countDocuments({});
            expect(logsCount).toBe(0);
        });

        it('should throw NegativeStockException when adjustment would result in negative quantity', async () => 
        {
            // Arrange
            const largeNegativeAdjustment: InStockAdjustmentDto = {
                type: InventoryLogType.CONSUMPTION,
                quantity: -15, // Current quantity is 10, this would result in -5
                note: 'Too much consumption',
            };

            // Act & Assert
            await expect(service.adjustStock(
                mockOrgId, 
                mockProductId, 
                mockUserId, 
                largeNegativeAdjustment
            )).rejects.toThrow(NegativeStockException);

            // Assert - Product quantity should remain unchanged
            const unchangedProduct = await productModel.findById(mockProductId);
            expect(unchangedProduct.currentQuantity).toBe(10);

            // Assert - No logs should be created
            const logsCount = await inventoryLogModel.countDocuments({});
            expect(logsCount).toBe(0);
        });

        it('should throw ZeroStockAdjustmentException when adjustment quantity is zero', async () => 
        {
            // Arrange
            const zeroAdjustment: InStockAdjustmentDto = {
                type: InventoryLogType.ADJUSTMENT,
                quantity: 0,
                note: 'Zero adjustment',
            };

            // Act & Assert
            await expect(service.adjustStock(
                mockOrgId, 
                mockProductId, 
                mockUserId, 
                zeroAdjustment
            )).rejects.toThrow(ZeroStockAdjustmentException);

            // Assert - Product quantity should remain unchanged
            const unchangedProduct = await productModel.findById(mockProductId);
            expect(unchangedProduct.currentQuantity).toBe(10);

            // Assert - No logs should be created
            const logsCount = await inventoryLogModel.countDocuments({});
            expect(logsCount).toBe(0);
        });

        it('should handle adjustment that results in zero quantity', async () => 
        {
            // Arrange
            const zeroQuantityAdjustment: InStockAdjustmentDto = {
                type: InventoryLogType.CONSUMPTION,
                quantity: -10, // Current quantity is 10, this results in 0
                note: 'All stock consumed',
            };

            // Act
            const result = await service.adjustStock(
                mockOrgId, 
                mockProductId, 
                mockUserId, 
                zeroQuantityAdjustment
            );

            // Assert - Verify log is created
            const savedLog = await inventoryLogModel.findById(result._id);
            expect(savedLog.newQuantity).toBe(0);

            // Assert - Verify product quantity is zero
            const updatedProduct = await productModel.findById(mockProductId);
            expect(updatedProduct.currentQuantity).toBe(0);
        });

        it('should maintain data consistency when product update fails', async () => 
        {
            // Arrange - Create a scenario where product update might fail
            // Mock the product model to simulate update failure
            const originalUpdateOne = productModel.updateOne;
            productModel.updateOne = jest.fn().mockReturnValue({
                exec: jest.fn().mockRejectedValue(new Error('Database error')),
            });

            try 
            {
                // Act & Assert
                await expect(service.adjustStock(
                    mockOrgId, 
                    mockProductId, 
                    mockUserId, 
                    mockAdjustmentDto
                )).rejects.toThrow('Database error');

                // Assert - No logs should remain in database (rollback)
                const logsCount = await inventoryLogModel.countDocuments({});
                expect(logsCount).toBe(0);

                // Assert - Product quantity should remain unchanged
                const unchangedProduct = await productModel.findById(mockProductId);
                expect(unchangedProduct.currentQuantity).toBe(10);
            } 
            finally 
            {
                // Restore original method
                productModel.updateOne = originalUpdateOne;
            }
        });
    });

    describe('getProductInventoryLogs', () => 
    {
        beforeEach(async () => 
        {
            // Create test product and multiple inventory logs
            await productModel.create(mockProduct);
            
            // Create inventory logs with different dates and types
            const baseDate = new Date('2025-06-01T10:00:00Z');
            const logs = [
                {
                    orgId: mockOrgId,
                    productId: mockProductId,
                    userId: mockUserId,
                    type: InventoryLogType.PURCHASE,
                    quantity: 10,
                    previousQuantity: 0,
                    newQuantity: 10,
                    note: 'Initial stock',
                    createdAt: new Date(baseDate.getTime()),
                },
                {
                    orgId: mockOrgId,
                    productId: mockProductId,
                    userId: mockUserId,
                    type: InventoryLogType.CONSUMPTION,
                    quantity: -2,
                    previousQuantity: 10,
                    newQuantity: 8,
                    note: 'Product consumed',
                    createdAt: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000), // +1 day
                },
                {
                    orgId: mockOrgId,
                    productId: mockProductId,
                    userId: mockUserId,
                    type: InventoryLogType.ADJUSTMENT,
                    quantity: 2,
                    previousQuantity: 8,
                    newQuantity: 10,
                    note: 'Manual adjustment',
                    createdAt: new Date(baseDate.getTime() + 48 * 60 * 60 * 1000), // +2 days
                },
            ];
            
            await inventoryLogModel.insertMany(logs);
        });

        it('should return all inventory logs for a product in descending order by date', async () => 
        {
            // Act
            const result = await service.getProductInventoryLogs(mockOrgId, mockProductId);

            // Assert - Verify all logs are returned
            expect(result).toHaveLength(3);

            // Assert - Verify logs are sorted by createdAt in descending order (most recent first)
            expect(result[0].type).toBe(InventoryLogType.ADJUSTMENT); // Most recent
            expect(result[1].type).toBe(InventoryLogType.CONSUMPTION); // Middle
            expect(result[2].type).toBe(InventoryLogType.PURCHASE); // Oldest

            // Assert - Verify log details
            expect(result[0].quantity).toBe(2);
            expect(result[1].quantity).toBe(-2);
            expect(result[2].quantity).toBe(10);
        });

        it('should filter inventory logs by start date', async () => 
        {
            // Arrange
            const startDate = new Date('2025-06-02T00:00:00Z'); // Exclude first log

            // Act
            const result = await service.getProductInventoryLogs(
                mockOrgId, 
                mockProductId, 
                startDate
            );

            // Assert - Only logs after start date should be returned
            expect(result).toHaveLength(2);
            expect(result[0].type).toBe(InventoryLogType.ADJUSTMENT);
            expect(result[1].type).toBe(InventoryLogType.CONSUMPTION);
        });

        it('should filter inventory logs by end date', async () => 
        {
            // Arrange
            const endDate = new Date('2025-06-01T23:59:59Z'); // Include only first log

            // Act
            const result = await service.getProductInventoryLogs(
                mockOrgId, 
                mockProductId, 
                undefined, 
                endDate
            );

            // Assert - Only logs before end date should be returned
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe(InventoryLogType.PURCHASE);
        });

        it('should filter inventory logs by date range', async () => 
        {
            // Arrange
            const startDate = new Date('2025-06-01T12:00:00Z');
            const endDate = new Date('2025-06-02T12:00:00Z');

            // Act
            const result = await service.getProductInventoryLogs(
                mockOrgId, 
                mockProductId, 
                startDate, 
                endDate
            );

            // Assert - Only logs within date range should be returned
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe(InventoryLogType.CONSUMPTION);
        });

        it('should return empty array when no logs exist for product', async () => 
        {
            // Arrange
            const newProductId = new Types.ObjectId();
            await productModel.create({
                _id: newProductId,
                orgId: mockOrgId,
                name: 'New Product',
                defaultUnit: 'bottle',
                currentQuantity: 0,
                categoryIds: [],
            });

            // Act
            const result = await service.getProductInventoryLogs(mockOrgId, newProductId);

            // Assert
            expect(result).toHaveLength(0);
        });

        it('should return empty array when no logs match date filter', async () => 
        {
            // Arrange
            const futureStartDate = new Date('2025-12-01T00:00:00Z');

            // Act
            const result = await service.getProductInventoryLogs(
                mockOrgId, 
                mockProductId, 
                futureStartDate
            );

            // Assert
            expect(result).toHaveLength(0);
        });

        it('should throw InvalidDateRangeException when start date is after end date', async () => 
        {
            // Arrange
            const startDate = new Date('2025-06-02T00:00:00Z');
            const endDate = new Date('2025-06-01T00:00:00Z'); // End date before start date

            // Act & Assert
            await expect(service.getProductInventoryLogs(
                mockOrgId, 
                mockProductId, 
                startDate, 
                endDate
            )).rejects.toThrow(InvalidDateRangeException);
        });

        it('should throw ProductNotFoundException when product does not exist', async () => 
        {
            // Arrange
            const nonExistentProductId = new Types.ObjectId();

            // Act & Assert
            await expect(service.getProductInventoryLogs(
                mockOrgId, 
                nonExistentProductId
            )).rejects.toThrow(ProductNotFoundException);
        });

        it('should throw ProductNotFoundException when product belongs to different organization', async () => 
        {
            // Act & Assert
            await expect(service.getProductInventoryLogs(
                mockOrgId2, 
                mockProductId
            )).rejects.toThrow(ProductNotFoundException);
        });

        it('should not return logs from other products in same organization', async () => 
        {
            // Arrange
            const anotherProductId = new Types.ObjectId();
            await productModel.create({
                _id: anotherProductId,
                orgId: mockOrgId,
                name: 'Another Product',
                defaultUnit: 'bottle',
                currentQuantity: 5,
                categoryIds: [],
            });

            // Create log for another product
            await inventoryLogModel.create({
                orgId: mockOrgId,
                productId: anotherProductId,
                userId: mockUserId,
                type: InventoryLogType.PURCHASE,
                quantity: 5,
                previousQuantity: 0,
                newQuantity: 5,
                note: 'Different product stock',
            });

            // Act
            const result = await service.getProductInventoryLogs(mockOrgId, mockProductId);

            // Assert - Should only return logs for the specified product
            expect(result).toHaveLength(3); // Original 3 logs for mockProductId
            expect(result.every(log => log.productId.toString() === mockProductId.toString())).toBe(true);
        });
    });
});
