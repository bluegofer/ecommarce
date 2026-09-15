// apps/api/src/modules/catalog/products/products.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SlugRedirectsService } from '../slug-redirects/slug-redirects.service';
import type { CreateProductDto, UpdateProductDto } from '@ecommarce/types';

@ApiTags('catalog')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly slugRedirects: SlugRedirectsService,
  ) {}

  @Public()
  @Get()
  list(
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('brand') brand?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.products.list({
      categoryId,
      status: status as never,
      brand,
      q,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    const hit = await this.products.findBySlug(slug);
    if (hit) return hit;
    const redirect = await this.slugRedirects.resolve(slug);
    if (redirect) return { redirectTo: redirect, statusCode: 301 };
    return null;
  }

  /**
   * Step 14.1 — top-N published product slugs for storefront ISR seeding.
   * Public + cacheable — safe to expose; contains no PII.
   */
  /**
   * Step 14.3 — sitemap feed: top-N published products for the XML sitemap.
   * Public + cacheable. Declared BEFORE :id route to avoid param capture.
   */
  @Public()
  @Get('sitemap-entries')
  async sitemapEntries(@Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : 1000;
    const safe = Number.isFinite(parsed) ? Math.min(Math.max(1, parsed), 5000) : 1000;
    return this.products.getSitemapEntries(safe);
  }

  @Public()
  @Get('static-slugs')
  async staticSlugs(@Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : 100;
    const safe = Number.isFinite(parsed) ? Math.min(Math.max(1, parsed), 500) : 100;
    return this.products.getStaticSlugs(safe);
  }

  @Public()
  @Get('redirects/list')
  listRedirects() {
    return this.slugRedirects.list();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.products.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }
}