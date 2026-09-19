// apps/api/src/modules/search/search.module.ts
// Module boundary: SearchService can be swapped for Meilisearch later
// without touching callers. Callers depend only on the DTOs in
// @ecommarce/types (SearchRequestDto, SearchResponseDto, etc.).
import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SuggestionsService } from './suggestions.service';
import { SearchController } from './search.controller';

@Module({
  controllers: [SearchController],
  providers: [SearchService, SuggestionsService],
  exports: [SearchService, SuggestionsService],
})
export class SearchModule {}