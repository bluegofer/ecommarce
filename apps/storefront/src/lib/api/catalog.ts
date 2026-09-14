import { api } from './client';
import type {
  CategoryNode,
  Paginated,
  ProductSummary,
  SearchResponse,
  VariantSummary,
} from './types';

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

/** Unwrap NestJS { value, Count } envelope when present. */
function unwrap<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'value' in response) {
    return (response as { value: T }).value;
  }
  return response as T;
}

export interface ListProductsParams {
  categoryId?: string;
  categorySlug?: string;
  status?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
  isFeatured?: boolean;
  page?: number;
  limit?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'best_sellers' | 'rating';
}

export interface SearchProductsParams {
  k?: string;
  categorySlug?: string;
  brand?: string;
  minPricePoisha?: number;
  maxPricePoisha?: number;
  minRating?: number;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating' | 'best_sellers';
  page?: number;
  pageSize?: number;
}

export const catalogApi = {
  async getCategoryTree(): Promise<CategoryNode[]> {
    const res = await api.get<unknown>('/categories/tree');
    return unwrap<CategoryNode[]>(res);
  },

  async getProductBySlug(slug: string): Promise<ProductSummary> {
    return api.get<ProductSummary>(`/products/slug/${encodeURIComponent(slug)}`);
  },

  async listProducts(params: ListProductsParams = {}): Promise<Paginated<ProductSummary>> {
    const q = qs({
      categoryId: params.categoryId,
      categorySlug: params.categorySlug,
      status: params.status ?? 'PUBLISHED',
      isFeatured: params.isFeatured,
      page: params.page ?? 1,
      limit: params.limit ?? 24,
      sort: params.sort,
    });
    return api.get<Paginated<ProductSummary>>(`/products${q}`);
  },

  async searchProducts(params: SearchProductsParams = {}): Promise<SearchResponse> {
    const q = qs({
      k: params.k,
      categorySlug: params.categorySlug,
      brand: params.brand,
      minPricePoisha: params.minPricePoisha,
      maxPricePoisha: params.maxPricePoisha,
      minRating: params.minRating,
      sort: params.sort ?? 'relevance',
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 48,
    });
    return api.get<SearchResponse>(`/search/products${q}`);
  },

  async getVariantsForProduct(productId: string): Promise<VariantSummary[]> {
    const res = await api.get<unknown>(`/variants/product/${encodeURIComponent(productId)}`);
    return unwrap<VariantSummary[]>(res);
  },

  /**
   * Step 14.1 — top-N published product slugs for ISR seeding.
   * Called from `generateStaticParams` at build time. Bounded (default 100).
   */
  async getStaticSlugs(limit = 100): Promise<Array<{ slug: string; updatedAt: string }>> {
    return api.get<Array<{ slug: string; updatedAt: string }>>(
      `/products/static-slugs?limit=${encodeURIComponent(String(limit))}`,
      { cache: 'no-store' },
    );
  },

  /**
   * Step 14.2 — top-N active category slugs for PLP ISR seeding.
   */
  async getStaticCategorySlugs(limit = 50): Promise<Array<{ slug: string; updatedAt: string }>> {
    return api.get<Array<{ slug: string; updatedAt: string }>>(
      `/categories/static-slugs?limit=${encodeURIComponent(String(limit))}`,
      { cache: 'no-store' },
    );
  },

  /**
   * Step 14.3 — sitemap feed for products.
   */
  async getSitemapProducts(
    limit = 1000,
  ): Promise<Array<{ slug: string; updatedAt: string; primaryImageUrl: string | null }>> {
    return api.get<Array<{ slug: string; updatedAt: string; primaryImageUrl: string | null }>>(
      `/products/sitemap-entries?limit=${encodeURIComponent(String(limit))}`,
      { cache: 'no-store' },
    );
  },

  /**
   * Step 14.3 — sitemap feed for categories.
   */
  async getSitemapCategories(): Promise<Array<{ slug: string; updatedAt: string }>> {
    return api.get<Array<{ slug: string; updatedAt: string }>>(
      '/categories/sitemap-entries',
      { cache: 'no-store' },
    );
  },
};