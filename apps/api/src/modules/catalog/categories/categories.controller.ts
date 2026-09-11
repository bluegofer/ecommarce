// apps/api/src/modules/catalog/categories/categories.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { CreateCategoryDto, UpdateCategoryDto } from '@ecommarce/types';

@ApiTags('catalog')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Public()
  @Get()
  list() {
    return this.categories.list();
  }

  @Public()
  @Get('tree')
  tree() {
    return this.categories.tree();
  }

  @Public()
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.categories.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categories.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categories.remove(id);
  }
}