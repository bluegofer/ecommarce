// apps/api/src/modules/search/search.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SuggestionsService } from './suggestions.service';
import { Public } from '../../common/decorators/public.decorator';
import type { SearchRequestDto, SortOrder } from '@ecommarce/types';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(
    private readonly search: SearchService,
    private readonly suggestions: SuggestionsService,
  ) {}

  @Public()
  @Get('products')
  async products(
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('brand') brand?: string,
    @Query('minPricePoisha') minPricePoisha?: string,
    @Query('maxPricePoisha') maxPricePoisha?: string,
    @Query('minRating') minRating?: string,
    @Query('inStock') inStock?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const req: SearchRequestDto = {
      q,
      categoryId,
      categorySlug,
      brand: brand ? brand.split(',').map((b) => b.trim()).filter(Boolean) : undefined,
      minPricePoisha: minPricePoisha ? Number(minPricePoisha) : undefined,
      maxPricePoisha: maxPricePoisha ? Number(maxPricePoisha) : undefined,
      minRating: minRating ? Number(minRating) : undefined,
      inStock: inStock === 'true' ? true : undefined,
      sort: sort as SortOrder | undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    };
    return this.search.search(req);
  }

  @Public()
  @Get('suggestions')
  suggestionsList(@Query('q') q?: string) {
    return this.suggestions.suggest(q ?? '');
  }
}