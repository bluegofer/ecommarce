// apps/api/src/modules/catalog/variants/variants.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VariantsService } from './variants.service';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import type {
  CreateVariantDto,
  UpdateVariantDto,
  VariantMatrixRequestDto,
} from '@ecommarce/types';

@ApiTags('catalog')
@Controller('variants')
export class VariantsController {
  constructor(private readonly variants: VariantsService) {}

  @Public()
  @Get('product/:productId')
  listByProduct(@Param('productId') productId: string) {
    return this.variants.listByProduct(productId);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.variants.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Post('product/:productId')
  create(@Param('productId') productId: string, @Body() dto: CreateVariantDto) {
    return this.variants.create(productId, dto);
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Post('matrix')
  matrix(@Body() req: VariantMatrixRequestDto) {
    return this.variants.generateMatrix(req);
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVariantDto) {
    return this.variants.update(id, dto);
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.variants.remove(id);
  }
}