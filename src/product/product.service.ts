import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product } from './schemas/product.schema';
import { InCreateProductDto } from './dto/in.create-product.dto';
import { InUpdateProductDto } from './dto/in.update-product.dto';
import { CategoryService } from '../category/category.service';
import { CustomLogger } from '../common/logger/custom.logger';

@Injectable()
export class ProductService 
{
    constructor(
        @InjectModel(Product.name) private readonly productModel: Model<Product>,
        private readonly categoryService: CategoryService,
        private readonly logger: CustomLogger,
    ) {}

    async createProduct(orgId: Types.ObjectId, createProductDto: InCreateProductDto): Promise<Product> 
    {
        this.logger.debug(`Creating product for org ${orgId}`, 'ProductService#createProduct');
        
        // Validate categories exist and belong to the same org
        if (createProductDto.categoryIds && createProductDto.categoryIds.length > 0) 
        {
            await this.validateCategories(orgId, createProductDto.categoryIds);
        }

        // Check if product name already exists in this org
        const existingProduct = await this.productModel.findOne({ 
            orgId, 
            name: createProductDto.name, 
        });
        
        if (existingProduct) 
        {
            throw new BadRequestException(`Product with name '${createProductDto.name}' already exists in this organization`);
        }

        const product = new this.productModel({
            ...createProductDto,
            categoryIds: createProductDto.categoryIds?.map(id => new Types.ObjectId(id)) || [],
            currentQuantity: createProductDto.currentQuantity ?? 0, // Use provided value or default to 0
            orgId,
        });

        const savedProduct = await product.save();
        this.logger.debug(`Product created with id: ${savedProduct._id}`, 'ProductService#createProduct');
        return savedProduct;
    }

    async findProductsByOrg(orgId: Types.ObjectId, categoryId?: string): Promise<Product[]> 
    {
        this.logger.debug(`Finding products for org ${orgId}`, 'ProductService#findProductsByOrg');
        
        const filter: any = { orgId };
        
        // If categoryId is provided, filter by category
        if (categoryId) 
        {
            filter.categoryIds = new Types.ObjectId(categoryId);
        }

        return this.productModel
            .find(filter)
            .sort({ name: 1 })
            .exec();
    }

    async findProductById(orgId: Types.ObjectId, productId: Types.ObjectId): Promise<Product> 
    {
        this.logger.debug(`Finding product ${productId} for org ${orgId}`, 'ProductService#findProductById');
        
        const product = await this.productModel
            .findOne({ _id: productId, orgId })
            .exec();

        if (!product) 
        {
            throw new NotFoundException(`Product with id ${productId} not found in organization ${orgId}`);
        }

        return product;
    }

    async updateProduct(
        orgId: Types.ObjectId, 
        productId: Types.ObjectId, 
        updateProductDto: InUpdateProductDto
    ): Promise<Product> 
    {
        this.logger.debug(`Updating product ${productId} for org ${orgId}`, 'ProductService#updateProduct');
        
        // Validate categories exist and belong to the same org
        if (updateProductDto.categoryIds && updateProductDto.categoryIds.length > 0) 
        {
            await this.validateCategories(orgId, updateProductDto.categoryIds);
        }

        // Check if product name already exists in this org (excluding current product)
        if (updateProductDto.name) 
        {
            const existingProduct = await this.productModel.findOne({ 
                orgId, 
                name: updateProductDto.name,
                _id: { $ne: productId },
            });
            
            if (existingProduct) 
            {
                throw new BadRequestException(`Product with name '${updateProductDto.name}' already exists in this organization`);
            }
        }

        const updateData: any = { ...updateProductDto };
        if (updateProductDto.categoryIds) 
        {
            updateData.categoryIds = updateProductDto.categoryIds.map(id => new Types.ObjectId(id));
        }

        const updatedProduct = await this.productModel
            .findOneAndUpdate(
                { _id: productId, orgId },
                updateData,
                { new: true }
            )
            .exec();

        if (!updatedProduct) 
        {
            throw new NotFoundException(`Product with id ${productId} not found in organization ${orgId}`);
        }

        this.logger.debug(`Product ${productId} updated successfully`, 'ProductService#updateProduct');
        return updatedProduct;
    }

    async deleteProduct(orgId: Types.ObjectId, productId: Types.ObjectId): Promise<void> 
    {
        this.logger.debug(`Deleting product ${productId} for org ${orgId}`, 'ProductService#deleteProduct');
        
        const deletedProduct = await this.productModel
            .findOneAndDelete({ _id: productId, orgId })
            .exec();

        if (!deletedProduct) 
        {
            throw new NotFoundException(`Product with id ${productId} not found in organization ${orgId}`);
        }

        this.logger.debug(`Product ${productId} deleted successfully`, 'ProductService#deleteProduct');
    }

    /**
     * Validates that all provided category IDs exist and belong to the organization
     */
    private async validateCategories(orgId: Types.ObjectId, categoryIds: string[]): Promise<void> 
    {
        this.logger.debug(`Validating categories for org ${orgId}`, 'ProductService#validateCategories');
        
        for (const categoryId of categoryIds) 
        {
            try 
            {
                await this.categoryService.findCategoryById(orgId, new Types.ObjectId(categoryId));
            } 
            catch (error) 
            {
                if (error instanceof NotFoundException) 
                {
                    throw new BadRequestException(`Category with id ${categoryId} not found in organization ${orgId}`);
                }
                throw error;
            }
        }
    }
}
