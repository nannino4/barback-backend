import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { InventoryService } from './inventory.service';
import { Product, ProductSchema } from './schemas/product.schema';
import { InventoryLog, InventoryLogSchema } from './schemas/inventory-log.schema';
import { OrgModule } from '../org/org.module';
import { CategoryModule } from '../category/category.module';
import { UserModule } from 'src/user/user.module';
import { AuthGuardModule } from 'src/auth/auth-guard.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Product.name, schema: ProductSchema },
            { name: InventoryLog.name, schema: InventoryLogSchema },
        ]),
        AuthGuardModule,
        OrgModule,
        CategoryModule,
        UserModule,
    ],
    controllers: [ProductController],
    providers: [ProductService, InventoryService],
    exports: [ProductService, InventoryService],
})
export class ProductModule { }
