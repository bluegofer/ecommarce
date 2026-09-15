// apps/api/src/modules/catalog/catalog.module.ts
import { Module } from '@nestjs/common';
import { CategoriesService } from './categories/categories.service';
import { CategoriesController } from './categories/categories.controller';
import { AttributesService } from './attributes/attributes.service';
import { AttributesController } from './attributes/attributes.controller';
import { ProductsService } from './products/products.service';
import { ProductsController } from './products/products.controller';
import { VariantsService } from './variants/variants.service';
import { VariantsController } from './variants/variants.controller';
import { SlugRedirectsService } from './slug-redirects/slug-redirects.service';
import { MediaController } from './media/media.controller';
import { ImportExportService } from './import-export/import-export.service';
import { ImportExportController } from './import-export/import-export.controller';

@Module({
  controllers: [
    CategoriesController,
    AttributesController,
    ProductsController,
    VariantsController,
    MediaController,
    ImportExportController,
  ],
  providers: [
    CategoriesService,
    AttributesService,
    ProductsService,
    VariantsService,
    SlugRedirectsService,
    ImportExportService,
  ],
  exports: [
    CategoriesService,
    AttributesService,
    ProductsService,
    VariantsService,
    SlugRedirectsService,
    ImportExportService,
  ],
})
export class CatalogModule {}