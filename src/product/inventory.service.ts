import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

        // Create the inventory log entry
        const inventoryLog = new this.inventoryLogModel({
            orgId,
            productId,
            userId,
            type: adjustmentDto.type,
            quantity: adjustmentDto.quantity,
            previousQuantity,
            newQuantity,
            note: adjustmentDto.note,
        });

        // Update the product quantity and save the log in a transaction-like approach
        // Note: For production, consider using MongoDB transactions
        try 
        {
            const savedLog = await inventoryLog.save();
            
            try 
            {
                await this.productModel.updateOne(
                    { _id: productId, orgId },
                    { currentQuantity: newQuantity }
                ).exec();
                
                this.logger.debug(`Stock adjusted for product ${productId}: ${previousQuantity} -> ${newQuantity}`, 'InventoryService#adjustStock');
                return savedLog;
            } 
            catch (productUpdateError) 
            {
                // If product update fails, remove the log entry to maintain consistency
                await this.inventoryLogModel.deleteOne({ _id: savedLog._id }).exec();
                const errorMessage = productUpdateError instanceof Error ? productUpdateError.message : 'Unknown error';
                throw new DatabaseOperationException('product stock update', errorMessage);
            }
        } 
        catch (error) 
        {
            if (error instanceof DatabaseOperationException) 
            {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseOperationException('inventory log creation', errorMessage);
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
