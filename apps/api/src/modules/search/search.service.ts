// apps/api/src/modules/search/search.service.ts
// PostgreSQL trigram + full-text + facet search.
// Module boundary: callers depend only on SearchRequestDto / SearchResponseDto.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  FacetBucket,
  PaginatedProductsDto,
  PriceRangeBucket,
  ProductDto,
  ProductStatus,
  SearchFacetsDto,
  SearchRequestDto,
  SearchResponseDto,
} from '@ecommarce/types';

interface ProductRow {
  id: string;
  categoryId: string;
  slug: string;
  titleEn: string;
  titleBn: string;
  descriptionEn: string | null;
  descriptionBn: string | null;
  brand: string | null;
  status: string;
  publishedAt: Date | null;
  metaTitle: string | null;
  metaDescription: string | null;
  bulletFeatures: unknown;
  specsJson: unknown;
  avgRating: unknown;
  ratingCount: number;
  soldCount: number;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface FacetRow {
  value: string | null;
  count: bigint;
}

interface PriceBucketRow {
  bucket: number;
  count: bigint;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(req: SearchRequestDto): Promise<SearchResponseDto> {
    const page = Math.max(1, req.page ?? 1);
    const pageSize = Math.min(96, Math.max(1, req.pageSize ?? 48));
    const offset = (page - 1) * pageSize;
    const sort = req.sort ?? 'relevance';

    // --- build WHERE fragments ---
    const params: unknown[] = [];
    const whereParts: string[] = [`p.status = 'PUBLISHED'`];

    if (req.categorySlug) {
      params.push(req.categorySlug);
      whereParts.push(`c.slug = $${params.length}`);
    }
    if (req.categoryId) {
      params.push(req.categoryId);
      whereParts.push(`p."categoryId" = $${params.length}`);
    }
    if (req.brand && req.brand.length > 0) {
      params.push(req.brand);
      whereParts.push(`p.brand = ANY($${params.length}::text[])`);
    }
    if (typeof req.minPricePoisha === 'number' || typeof req.maxPricePoisha === 'number') {
      // must consider variant price range
      if (typeof req.minPricePoisha === 'number') {
        params.push(req.minPricePoisha);
        whereParts.push(
          `EXISTS (SELECT 1 FROM variants v2 WHERE v2."productId" = p.id AND v2."isActive" = true AND v2."pricePoisha" >= $${params.length})`,
        );
      }
      if (typeof req.maxPricePoisha === 'number') {
        params.push(req.maxPricePoisha);
        whereParts.push(
          `EXISTS (SELECT 1 FROM variants v3 WHERE v3."productId" = p.id AND v3."isActive" = true AND v3."pricePoisha" <= $${params.length})`,
        );
      }
    }
    if (typeof req.minRating === 'number') {
      params.push(req.minRating);
      whereParts.push(`p."avgRating" >= $${params.length}`);
    }
    if (req.inStock) {
      whereParts.push(
        `EXISTS (SELECT 1 FROM variants v4 WHERE v4."productId" = p.id AND v4."isActive" = true AND v4.stock > 0)`,
      );
    }

    // free-text query: trigram similarity OR full-text vector
    let scoreExpr = '0';
    if (req.q && req.q.trim().length >= 2) {
      const q = req.q.trim();
      params.push(q);
      const qIdx = params.length;
      whereParts.push(
        `(p."titleEn" % $${qIdx} OR p."titleBn" % $${qIdx} OR p.brand % $${qIdx} OR ` +
          `to_tsvector('simple', coalesce(p."titleEn",'') || ' ' || coalesce(p."titleBn",'') || ' ' || coalesce(p.brand,'')) ` +
          `@@ plainto_tsquery('simple', $${qIdx}))`,
      );
      scoreExpr = `GREATEST(similarity(p."titleEn", $${qIdx}), similarity(coalesce(p.brand,''), $${qIdx}))`;
    }

    const whereSql = whereParts.join(' AND ');

    // --- sort ---
    let orderSql = 'p."createdAt" DESC';
    switch (sort) {
      case 'relevance':
        orderSql = req.q ? `${scoreExpr} DESC, p."soldCount" DESC` : 'p."soldCount" DESC';
        break;
      case 'price_asc':
        orderSql = `(SELECT MIN(v5."pricePoisha") FROM variants v5 WHERE v5."productId" = p.id AND v5."isActive" = true) ASC NULLS LAST`;
        break;
      case 'price_desc':
        orderSql = `(SELECT MAX(v6."pricePoisha") FROM variants v6 WHERE v6."productId" = p.id AND v6."isActive" = true) DESC NULLS LAST`;
        break;
      case 'newest':
        orderSql = 'p."createdAt" DESC';
        break;
      case 'rating':
        orderSql = 'p."avgRating" DESC, p."ratingCount" DESC';
        break;
      case 'best_sellers':
        orderSql = 'p."soldCount" DESC';
        break;
    }

    // --- main query + count in one round trip ---
    const items = await this.prisma.$queryRawUnsafe<ProductRow[]>(
      `SELECT p.* FROM products p JOIN categories c ON c.id = p."categoryId"
       WHERE ${whereSql}
       ORDER BY ${orderSql}
       LIMIT ${pageSize} OFFSET ${offset}`,
      ...params,
    );

    const totalRows = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM products p JOIN categories c ON c.id = p."categoryId"
       WHERE ${whereSql}`,
      ...params,
    );
    const total = Number(totalRows[0]?.count ?? 0);

    const facets = await this.buildFacets(whereSql, params);

    return {
      items: items.map((p) => this.toDto(p)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      facets,
    };
  }

  async listByCategory(
    categorySlug: string,
    req: SearchRequestDto,
  ): Promise<SearchResponseDto> {
    return this.search({ ...req, categorySlug });
  }

  private async buildFacets(
    whereSql: string,
    params: unknown[],
  ): Promise<SearchFacetsDto> {
    // brand facet
    const brandRows = await this.prisma.$queryRawUnsafe<FacetRow[]>(
      `SELECT p.brand AS value, COUNT(*)::bigint AS count
       FROM products p JOIN categories c ON c.id = p."categoryId"
       WHERE ${whereSql} AND p.brand IS NOT NULL
       GROUP BY p.brand ORDER BY count DESC LIMIT 30`,
      ...params,
    );
    const brands: FacetBucket[] = brandRows.map((r) => ({
      value: r.value ?? '',
      count: Number(r.count),
    }));

    // category facet
    const catRows = await this.prisma.$queryRawUnsafe<FacetRow[]>(
      `SELECT c.slug AS value, COUNT(*)::bigint AS count
       FROM products p JOIN categories c ON c.id = p."categoryId"
       WHERE ${whereSql}
       GROUP BY c.slug ORDER BY count DESC LIMIT 30`,
      ...params,
    );
    const categories: FacetBucket[] = catRows.map((r) => ({
      value: r.value ?? '',
      count: Number(r.count),
    }));

    // rating facet (counts per star threshold)
    const ratingRows = await this.prisma.$queryRawUnsafe<Array<{ stars: number; count: bigint }>>(
      `SELECT FLOOR(p."avgRating")::int AS stars, COUNT(*)::bigint AS count
       FROM products p JOIN categories c ON c.id = p."categoryId"
       WHERE ${whereSql} AND p."ratingCount" > 0
       GROUP BY stars ORDER BY stars DESC`,
      ...params,
    );
    const ratings: FacetBucket[] = ratingRows.map((r) => ({
      value: String(r.stars),
      count: Number(r.count),
    }));

    // price buckets (fixed ৳ ranges in poisha)
    const priceBuckets: PriceRangeBucket[] = [
      { minPoisha: 0, maxPoisha: 100000, count: 0 },        // 0 - 1000
      { minPoisha: 100000, maxPoisha: 300000, count: 0 },    // 1000 - 3000
      { minPoisha: 300000, maxPoisha: 500000, count: 0 },    // 3000 - 5000
      { minPoisha: 500000, maxPoisha: 2147483647, count: 0 }, // 5000+
    ];
    const priceRows = await this.prisma.$queryRawUnsafe<Array<{ min_bucket: number; count: bigint }>>(
      `SELECT
         CASE
           WHEN min_price < 100000 THEN 0
           WHEN min_price < 300000 THEN 1
           WHEN min_price < 500000 THEN 2
           ELSE 3
         END AS min_bucket,
         COUNT(*)::bigint AS count
       FROM (
         SELECT p.id, MIN(v."pricePoisha") AS min_price
         FROM products p JOIN categories c ON c.id = p."categoryId"
         JOIN variants v ON v."productId" = p.id AND v."isActive" = true
         WHERE ${whereSql}
         GROUP BY p.id
       ) t
       GROUP BY min_bucket`,
      ...params,
    );
    for (const r of priceRows) {
      const idx = Number(r.min_bucket);
      const bucket = priceBuckets[idx];
      if (bucket) {
        bucket.count = Number(r.count);
      }
    }

    return {
      brands,
      categories,
      ratings,
      priceRanges: priceBuckets,
      attributes: {},
    };
  }

  private toDto(p: ProductRow): ProductDto {
    return {
      id: p.id,
      categoryId: p.categoryId,
      slug: p.slug,
      titleEn: p.titleEn,
      titleBn: p.titleBn,
      descriptionEn: p.descriptionEn,
      descriptionBn: p.descriptionBn,
      brand: p.brand,
      status: p.status as ProductStatus,
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      bulletFeatures: Array.isArray(p.bulletFeatures) ? (p.bulletFeatures as string[]) : null,
      specsJson:
        p.specsJson && typeof p.specsJson === 'object'
          ? (p.specsJson as Record<string, string>)
          : null,
      avgRating: Number(p.avgRating ?? 0),
      ratingCount: p.ratingCount,
      soldCount: p.soldCount,
      isFeatured: p.isFeatured,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  // kept for future use
  async listPlain(): Promise<PaginatedProductsDto | null> {
    return null;
  }
}