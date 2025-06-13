import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InventoryLog } from './schemas/inventory-log.schema';
import { Product } from './schemas/product.schema';
import { InStockAdjustmentDto } from './dto/in.stock-adjustment.dto';

@Injectable()
export class InventoryService 
{
    private readonly logger = new Logger(InventoryService.name);

    constructor(
        @InjectModel(InventoryLog.name) private readonly inventoryLogModel: Model<InventoryLog>,
        @InjectModel(Product.name) private readonly productModel: Model<Product>,
    ) {}

    async adjustStock(
        orgId: Types.ObjectId, 
        productId: Types.ObjectId, 
        userId: Types.ObjectId,
        adjustmentDto: InStockAdjustmentDto
    ): Promise<InventoryLog> 
    {
        this.logger.debug(`Adjusting stock for product ${productId} in org ${orgId}`, 'InventoryService#adjustStock');

        // Find the product and verify it belongs to the organization
        const product = await this.productModel.findOne({ _id: productId, orgId }).exec();
        if (!product) 
        {
            throw new NotFoundException(`Product with id ${productId} not found in organization ${orgId}`);
        }

        const previousQuantity = product.currentQuantity;
        const newQuantity = previousQuantity + adjustmentDto.quantity;

        // Validate the new quantity is not negative
        if (newQuantity < 0) 
        {
            throw new BadRequestException(`Stock adjustment would result in negative quantity. Current: ${previousQuantity}, Adjustment: ${adjustmentDto.quantity}`);
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
        const savedLog = await inventoryLog.save();
        
        try 
        {
            await this.productModel.updateOne(
                { _id: productId, orgId },
                { currentQuantity: newQuantity }
            ).exec();
        } 
        catch (error) 
        {
            // If product update fails, remove the log entry to maintain consistency
            await this.inventoryLogModel.deleteOne({ _id: savedLog._id }).exec();
            throw error;
        }

        this.logger.debug(`Stock adjusted for product ${productId}: ${previousQuantity} -> ${newQuantity}`, 'InventoryService#adjustStock');
        return savedLog;
    }

    async getProductInventoryLogs(
        orgId: Types.ObjectId, 
        productId: Types.ObjectId,
        startDate?: Date,
        endDate?: Date
    ): Promise<InventoryLog[]> 
    {
        this.logger.debug(`Getting inventory logs for product ${productId} in org ${orgId}`, 'InventoryService#getProductInventoryLogs');

        // Verify product exists and belongs to organization
        const product = await this.productModel.findOne({ _id: productId, orgId }).exec();
        if (!product) 
        {
            throw new NotFoundException(`Product with id ${productId} not found in organization ${orgId}`);
        }

        const query: any = { orgId, productId };

        // Add date range filter if provided
        if (startDate || endDate) 
        {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = startDate;
            if (endDate) query.createdAt.$lte = endDate;
        }

        const logs = await this.inventoryLogModel
            .find(query)
            .sort({ createdAt: -1 })  // Most recent first
            .exec();

        this.logger.debug(`Found ${logs.length} inventory logs for product ${productId}`, 'InventoryService#getProductInventoryLogs');
        return logs;
    }
}
