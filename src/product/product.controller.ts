import { 
    Controller, 
    Get, 
    Post, 
    Put, 
    Delete, 
    Body, 
    Param, 
    Query,
    UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ProductService } from './product.service';
import { InventoryService } from './inventory.service';
import { InCreateProductDto } from './dto/in.create-product.dto';
import { InUpdateProductDto } from './dto/in.update-product.dto';
import { InStockAdjustmentDto } from './dto/in.stock-adjustment.dto';
import { OutProductDto } from './dto/out.product.dto';
import { OutInventoryLogDto } from './dto/out.inventory-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRolesGuard } from '../org/guards/org-roles.guard';
import { OrgRoles } from '../org/decorators/org-roles.decorator';
import { OrgRole } from '../org/schemas/user-org-relation.schema';
import { ObjectIdValidationPipe } from '../pipes/object-id-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/schemas/user.schema';
import { plainToInstance } from 'class-transformer';
import { CustomLogger } from '../common/logger/custom.logger';
import { InvalidDateRangeException } from './exceptions/product.exceptions';

@Controller('orgs/:orgId/products')
@UseGuards(JwtAuthGuard, OrgRolesGuard)
export class ProductController 
{
    constructor(
        private readonly productService: ProductService,
        private readonly inventoryService: InventoryService,
        private readonly logger: CustomLogger,
    ) {}

    @Get()
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER, OrgRole.STAFF)
    async getProducts(
        @Param('orgId', ObjectIdValidationPipe) orgId: Types.ObjectId,
        @Query('categoryId') categoryId?: string,
    ): Promise<OutProductDto[]> 
    {
        this.logger.debug(`Getting products for org ${orgId}`, 'ProductController#getProducts');
        
        const products = await this.productService.findProductsByOrg(orgId, categoryId);
        return plainToInstance(OutProductDto, products, { excludeExtraneousValues: true });
    }

    @Get(':id')
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER, OrgRole.STAFF)
    async getProduct(
        @Param('orgId', ObjectIdValidationPipe) orgId: Types.ObjectId,
        @Param('id', ObjectIdValidationPipe) productId: Types.ObjectId,
    ): Promise<OutProductDto> 
    {
        this.logger.debug(`Getting product ${productId} for org ${orgId}`, 'ProductController#getProduct');
        
        const product = await this.productService.findProductById(orgId, productId);
        return plainToInstance(OutProductDto, product, { excludeExtraneousValues: true });
    }

    @Post()
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER)
    async createProduct(
        @Param('orgId', ObjectIdValidationPipe) orgId: Types.ObjectId,
        @Body() createProductDto: InCreateProductDto,
    ): Promise<OutProductDto> 
    {
        this.logger.debug(`Creating product for org ${orgId}`, 'ProductController#createProduct');
        
        const product = await this.productService.createProduct(orgId, createProductDto);
        return plainToInstance(OutProductDto, product, { excludeExtraneousValues: true });
    }

    @Put(':id')
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER)
    async updateProduct(
        @Param('orgId', ObjectIdValidationPipe) orgId: Types.ObjectId,
        @Param('id', ObjectIdValidationPipe) productId: Types.ObjectId,
        @Body() updateProductDto: InUpdateProductDto,
    ): Promise<OutProductDto> 
    {
        this.logger.debug(`Updating product ${productId} for org ${orgId}`, 'ProductController#updateProduct');
        
        const product = await this.productService.updateProduct(orgId, productId, updateProductDto);
        return plainToInstance(OutProductDto, product, { excludeExtraneousValues: true });
    }

    @Delete(':id')
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER)
    async deleteProduct(
        @Param('orgId', ObjectIdValidationPipe) orgId: Types.ObjectId,
        @Param('id', ObjectIdValidationPipe) productId: Types.ObjectId,
    ): Promise<{ message: string }> 
    {
        this.logger.debug(`Deleting product ${productId} for org ${orgId}`, 'ProductController#deleteProduct');
        
        await this.productService.deleteProduct(orgId, productId);
        return { message: 'Product deleted successfully' };
    }

    // ===== INVENTORY ENDPOINTS =====

    @Post(':id/adjust-stock')
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER, OrgRole.STAFF)
    async adjustStock(
        @Param('orgId', ObjectIdValidationPipe) orgId: Types.ObjectId,
        @Param('id', ObjectIdValidationPipe) productId: Types.ObjectId,
        @CurrentUser() user: User,
        @Body() adjustmentDto: InStockAdjustmentDto,
    ): Promise<OutInventoryLogDto> 
    {
        this.logger.debug(`Adjusting stock for product ${productId} in org ${orgId}`, 'ProductController#adjustStock');
        
        const inventoryLog = await this.inventoryService.adjustStock(
            orgId, 
            productId, 
            user._id as Types.ObjectId,
            adjustmentDto
        );
        
        return plainToInstance(OutInventoryLogDto, inventoryLog, { excludeExtraneousValues: true });
    }

    @Get(':id/logs')
    @OrgRoles(OrgRole.OWNER, OrgRole.MANAGER, OrgRole.STAFF)
    async getProductInventoryLogs(
        @Param('orgId', ObjectIdValidationPipe) orgId: Types.ObjectId,
        @Param('id', ObjectIdValidationPipe) productId: Types.ObjectId,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ): Promise<OutInventoryLogDto[]> 
    {
        this.logger.debug(`Getting inventory logs for product ${productId} in org ${orgId}`, 'ProductController#getProductInventoryLogs');
        
        // Handle date parsing with validation
        let startDateObj: Date | undefined;
        let endDateObj: Date | undefined;
        
        if (startDate) 
        {
            startDateObj = new Date(startDate);
            if (isNaN(startDateObj.getTime())) 
            {
                throw new InvalidDateRangeException('Invalid start date format provided');
            }
        }
        
        if (endDate) 
        {
            endDateObj = new Date(endDate);
            if (isNaN(endDateObj.getTime())) 
            {
                throw new InvalidDateRangeException('Invalid end date format provided');
            }
        }
        
        // Validate date range if both dates are provided
        if (startDateObj && endDateObj && startDateObj > endDateObj) 
        {
            throw new InvalidDateRangeException('Start date must be before or equal to end date');
        }
        
        const logs = await this.inventoryService.getProductInventoryLogs(
            orgId, 
            productId, 
            startDateObj, 
            endDateObj
        );
        
        return plainToInstance(OutInventoryLogDto, logs, { excludeExtraneousValues: true });
    }
}
