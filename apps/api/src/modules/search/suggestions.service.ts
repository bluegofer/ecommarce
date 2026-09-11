// apps/api/src/modules/search/suggestions.service.ts
// Autocomplete: typo-tolerant via trigram similarity, plus trending from recent orders.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { SuggestionDto, SuggestionsResponseDto } from '@ecommarce/types';

const TRENDING_KEY = 'search:trending';
const TRENDING_MAX = 10;

@Injectable()
export class SuggestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async suggest(q: string, limit = 8): Promise<SuggestionsResponseDto> {
    const query = q.trim();
    if (query.length < 2) return { suggestions: [], trending: await this.trending() };

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ text: string; type: string; slug: string | null; score: number }>
    >(
      `SELECT text, type, slug, score FROM (
         SELECT p."titleEn" AS text, 'product' AS type, p.slug AS slug,
                similarity(p."titleEn", $1) AS score
         FROM products p
         WHERE p.status = 'PUBLISHED' AND p."titleEn" % $1
         UNION ALL
         SELECT p.brand AS text, 'brand' AS type, NULL::text AS slug,
                similarity(p.brand, $1) AS score
         FROM products p
         WHERE p.status = 'PUBLISHED' AND p.brand IS NOT NULL AND p.brand % $1
         UNION ALL
         SELECT c."nameEn" AS text, 'category' AS type, c.slug AS slug,
                similarity(c."nameEn", $1) AS score
         FROM categories c
         WHERE c."isActive" = true AND c."nameEn" % $1
       ) s
       GROUP BY text, type, slug, score
       ORDER BY score DESC, text ASC
       LIMIT $2`,
      query,
      limit,
    );

    const suggestions: SuggestionDto[] = rows.map((r) => ({
      text: r.text,
      type: r.type as SuggestionDto['type'],
      slug: r.slug ?? undefined,
      score: Number(r.score),
    }));

    return { suggestions, trending: await this.trending() };
  }

  async trending(): Promise<string[]> {
    try {
      const raw = await this.prisma.$queryRawUnsafe<Array<{ term: string }>>(
        `SELECT term FROM search_terms
         WHERE "createdAt" > NOW() - INTERVAL '7 days'
         GROUP BY term ORDER BY COUNT(*) DESC LIMIT $1`,
        TRENDING_MAX,
      );
      return raw.map((r) => r.term);
    } catch {
      // search_terms table doesn't exist yet (arrives in Step 6)
      return [];
    }
  }

  // Stub used from later steps
  async recordTerm(_term: string): Promise<void> {
    // no-op until Step 6
  }

  get trendingKey(): string {
    return TRENDING_KEY;
  }
}