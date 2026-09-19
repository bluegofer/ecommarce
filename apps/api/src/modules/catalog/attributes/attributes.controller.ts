// apps/api/src/modules/catalog/attributes/attributes.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AttributesService } from './attributes.service';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import type {
  AttachAttributeDto,
  CreateAttributeDto,
  UpdateAttributeDto,
} from '@ecommarce/types';

@ApiTags('catalog')
@Controller('attributes')
export class AttributesController {
  constructor(private readonly attributes: AttributesService) {}

  @Public()
  @Get()
  list() {
    return this.attributes.list();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attributes.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Post()
  create(@Body() dto: CreateAttributeDto) {
    return this.attributes.create(dto);
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAttributeDto) {
    return this.attributes.update(id, dto);
  }

  @Public()
  @Get('category/:categoryId')
  listForCategory(@Param('categoryId') categoryId: string) {
    return this.attributes.listForCategory(categoryId);
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Post('category/:categoryId')
  attachToCategory(@Param('categoryId') categoryId: string, @Body() dto: AttachAttributeDto) {
    return this.attributes.attachToCategory(categoryId, dto);
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Delete('category/:categoryId/:attributeId')
  detachFromCategory(
    @Param('categoryId') categoryId: string,
    @Param('attributeId') attributeId: string,
  ) {
    return this.attributes.detachFromCategory(categoryId, attributeId);
  }
}