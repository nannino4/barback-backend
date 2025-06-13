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
    Logger,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ProductService } from './product.service';
import { InCreateProductDto } from './dto/in.create-product.dto';
import { InUpdateProductDto } from './dto/in.update-product.dto';
import { OutProductDto } from './dto/out.product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRolesGuard } from '../org/guards/org-roles.guard';
import { OrgRoles } from '../org/decorators/org-roles.decorator';
import { OrgRole } from '../org/schemas/user-org-relation.schema';
import { ObjectIdValidationPipe } from '../pipes/object-id-validation.pipe';
import { plainToInstance } from 'class-transformer';

@Controller('orgs/:orgId/products')
@UseGuards(JwtAuthGuard, OrgRolesGuard)
export class ProductController 
{
    private readonly logger = new Logger(ProductController.name);

    constructor(private readonly productService: ProductService) {}

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
}
