import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { InventoryLog } from './schemas/inventory-log.schema';
import { Product } from './schemas/product.schema';
import { InStockAdjustmentDto } from './dto/in.stock-adjustment.dto';
import { CustomLogger } from '../common/logger/custom.logger';
import { DatabaseOperationException } from '../common/exceptions/database.exceptions';
import { 
    ProductNotFoundException,
    NegativeStockException,
    ZeroStockAdjustmentException,
    InvalidDateRangeException,
} from './exceptions/product.exceptions';

@Injectable()
export class InventoryService 
{
    constructor(
        @InjectModel(InventoryLog.name) private readonly inventoryLogModel: Model<InventoryLog>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    private readonly logger: CustomLogger,
    @InjectConnection() private readonly connection: Connection,
    ) {}

    async adjustStock(
        orgId: Types.ObjectId, 
        productId: Types.ObjectId, 
        userId: Types.ObjectId,
        adjustmentDto: InStockAdjustmentDto
    ): Promise<InventoryLog> 
    {
        this.logger.debug(`Adjusting stock for product ${productId} in org ${orgId}`, 'InventoryService#adjustStock');

        // Validate adjustment quantity is not zero
        if (adjustmentDto.quantity === 0) 
        {
            throw new ZeroStockAdjustmentException();
        }

        // Find the product and verify it belongs to the organization
        let product: Product | null;
        try 
        {
            product = await this.productModel.findOne({ _id: productId, orgId }).exec();
        } 
        catch (error) 
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseOperationException('product lookup for stock adjustment', errorMessage);
        }

        if (!product) 
        {
            throw new ProductNotFoundException(productId.toString());
        }

        const previousQuantity = product.currentQuantity;
        const newQuantity = previousQuantity + adjustmentDto.quantity;

        // Validate the new quantity is not negative
        if (newQuantity < 0) 
        {
            throw new NegativeStockException(previousQuantity, adjustmentDto.quantity);
        }

        // Execute atomic operation (log creation + product quantity update) with a manual session
        const session = await this.connection.startSession();
        this.logger.debug('Starting transaction session for inventory stock adjustment', 'InventoryService#adjustStock');
        try 
        {
            let savedLog: InventoryLog | null = null;
            await session.withTransaction(async () => 
            {
                const log = new this.inventoryLogModel({
                    orgId,
                    productId,
                    userId,
                    type: adjustmentDto.type,
                    quantity: adjustmentDto.quantity,
                    previousQuantity,
                    newQuantity,
                    note: adjustmentDto.note,
                });
                await log.save({ session });

                const updateResult = await this.productModel.updateOne(
                    { _id: productId, orgId },
                    { currentQuantity: newQuantity },
                    { session }
                ).exec();

                if (updateResult.modifiedCount !== 1)
                {
                    throw new DatabaseOperationException('product stock update', 'Expected exactly one product document to be updated');
                }

                savedLog = log;
            });

            if (!savedLog)
            {
                throw new DatabaseOperationException('inventory stock adjustment', 'Transaction completed without persisted log');
            }
            this.logger.debug(`Stock adjusted for product ${productId}: ${previousQuantity} -> ${newQuantity}`, 'InventoryService#adjustStock');
            return savedLog;
        }
        catch (error)
        {
            if (error instanceof DatabaseOperationException)
            {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseOperationException('inventory stock adjustment transaction', errorMessage);
        }
        finally
        {
            await session.endSession();
            this.logger.debug('Ended transaction session for inventory stock adjustment', 'InventoryService#adjustStock');
        }
    }

    async getProductInventoryLogs(
        orgId: Types.ObjectId, 
        productId: Types.ObjectId,
        startDate?: Date,
        endDate?: Date
    ): Promise<InventoryLog[]> 
    {
        this.logger.debug(`Getting inventory logs for product ${productId} in org ${orgId}`, 'InventoryService#getProductInventoryLogs');

        // Validate date range if both dates are provided
        if (startDate && endDate && startDate > endDate) 
        {
            throw new InvalidDateRangeException();
        }

        // Verify product exists and belongs to organization
        let product: Product | null;
        try 
        {
            product = await this.productModel.findOne({ _id: productId, orgId }).exec();
        } 
        catch (error) 
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseOperationException('product lookup for logs', errorMessage);
        }

        if (!product) 
        {
            throw new ProductNotFoundException(productId.toString());
        }

        const query: any = { orgId, productId };

        // Add date range filter if provided
        if (startDate || endDate) 
        {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = startDate;
            if (endDate) query.createdAt.$lte = endDate;
        }

        try 
        {
            const logs = await this.inventoryLogModel
                .find(query)
                .sort({ createdAt: -1 })  // Most recent first
                .exec();

            this.logger.debug(`Found ${logs.length} inventory logs for product ${productId}`, 'InventoryService#getProductInventoryLogs');
            return logs;
        } 
        catch (error) 
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseOperationException('inventory logs retrieval', errorMessage);
        }
    }
}
