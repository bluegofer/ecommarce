// apps/api/src/modules/catalog/products/products.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { slugify } from '../../../common/utils/slugify';
import { SlugRedirectsService } from '../slug-redirects/slug-redirects.service';
import type {
  CreateProductDto,
  PaginatedProductsDto,
  ProductDto,
  ProductListQueryDto,
  ProductStatus,
  UpdateProductDto,
} from '@ecommarce/types';
import type { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slugRedirects: SlugRedirectsService,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductDto> {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.titleEn);
    const existing = await this.prisma.product.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException(`slug already exists: ${slug}`);

    const cat = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!cat) throw new BadRequestException('category not found');

    const status: ProductStatus = dto.status ?? 'DRAFT';
    const publishedAt =
      status === 'PUBLISHED'
        ? dto.publishedAt
          ? new Date(dto.publishedAt)
          : new Date()
        : dto.publishedAt
          ? new Date(dto.publishedAt)
          : null;

    const created = await this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        slug,
        titleEn: dto.titleEn,
        titleBn: dto.titleBn,
        descriptionEn: dto.descriptionEn ?? null,
        descriptionBn: dto.descriptionBn ?? null,
        brand: dto.brand ?? null,
        status,
        publishedAt,
        metaTitle: dto.metaTitle ?? null,
        metaDescription: dto.metaDescription ?? null,
        bulletFeatures: (dto.bulletFeatures as unknown as object) ?? undefined,
        specsJson: (dto.specsJson as unknown as object) ?? undefined,
        isFeatured: dto.isFeatured ?? false,
      },
    });

    if (dto.attributeValues && dto.attributeValues.length > 0) {
      await this.upsertAttributeValues(created.id, dto.attributeValues);
    }

    return this.toDto(created);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDto> {
    const current = await this.prisma.product.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('product not found');

    const data: Record<string, unknown> = {};
    if (dto.titleEn !== undefined) data.titleEn = dto.titleEn;
    if (dto.titleBn !== undefined) data.titleBn = dto.titleBn;
    if (dto.descriptionEn !== undefined) data.descriptionEn = dto.descriptionEn;
    if (dto.descriptionBn !== undefined) data.descriptionBn = dto.descriptionBn;
    if (dto.brand !== undefined) data.brand = dto.brand;
    if (dto.metaTitle !== undefined) data.metaTitle = dto.metaTitle;
    if (dto.metaDescription !== undefined) data.metaDescription = dto.metaDescription;
    if (dto.bulletFeatures !== undefined) data.bulletFeatures = dto.bulletFeatures;
    if (dto.specsJson !== undefined) data.specsJson = dto.specsJson;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;
    if (dto.categoryId !== undefined) {
      const cat = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!cat) throw new BadRequestException('category not found');
      data.categoryId = dto.categoryId;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'PUBLISHED' && !current.publishedAt) {
        data.publishedAt = new Date();
      }
    }
    if (dto.publishedAt !== undefined) data.publishedAt = new Date(dto.publishedAt);

    if (dto.slug !== undefined) {
      const newSlug = slugify(dto.slug);
      if (newSlug !== current.slug) {
        const collide = await this.prisma.product.findUnique({ where: { slug: newSlug } });
        if (collide) throw new BadRequestException(`slug already exists: ${newSlug}`);
        data.slug = newSlug;
      }
    }

    const updated = await this.prisma.product.update({ where: { id }, data });

    if (data.slug && typeof data.slug === 'string' && data.slug !== current.slug) {
      await this.slugRedirects.record(current.slug, data.slug, 'product');
    }

    if (dto.attributeValues) {
      await this.upsertAttributeValues(id, dto.attributeValues);
    }

    return this.toDto(updated);
  }

  async findOne(id: string): Promise<ProductDto> {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true, media: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!p) throw new NotFoundException('product not found');
    return this.toDto(p);
  }

  async findBySlug(slug: string): Promise<ProductDto | null> {
    const p = await this.prisma.product.findUnique({
      where: { slug },
      include: { variants: true, media: { orderBy: { sortOrder: 'asc' } } },
    });
    return p ? this.toDto(p) : null;
  }

  async list(query: ProductListQueryDto): Promise<PaginatedProductsDto> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(96, Math.max(1, query.pageSize ?? 24));
    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductWhereInput = {};
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.status) where.status = query.status;
    if (query.brand) where.brand = query.brand;
    if (query.q) {
      where.OR = [
        { titleEn: { contains: query.q, mode: 'insensitive' } },
        { titleBn: { contains: query.q, mode: 'insensitive' } },
        { brand: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: pageSize,
        include: { variants: true, media: { orderBy: { sortOrder: 'asc' } } },
      }),
    ]);

    return {
      items: items.map((p) => this.toDto(p)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Step 14.1 — returns slug + updatedAt for the top-N products by soldCount
   * (published only). Used by the storefront's `generateStaticParams` for ISR.
   * Not paginated — a bounded static-seed list.
   */
  async getStaticSlugs(limit: number): Promise<Array<{ slug: string; updatedAt: string }>> {
    const take = Math.min(Math.max(1, limit), 500);
    const rows = await this.prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
      take,
      select: { slug: true, updatedAt: true },
    });
    return rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.toISOString() }));
  }

  async remove(id: string): Promise<{ ok: true }> {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('product not found');
    await this.prisma.product.delete({ where: { id } });
    return { ok: true };
  }

  private async upsertAttributeValues(
    productId: string,
    values: Array<{
      attributeId: string;
      valueText?: string | null;
      valueNumber?: number | null;
      valueBool?: boolean | null;
      valueJson?: unknown;
    }>,
  ): Promise<void> {
    for (const v of values) {
      await this.prisma.productAttributeValue.upsert({
        where: { productId_attributeId: { productId, attributeId: v.attributeId } },
        create: {
          productId,
          attributeId: v.attributeId,
          valueText: v.valueText ?? null,
          valueNumber: v.valueNumber ?? null,
          valueBool: v.valueBool ?? null,
          valueJson: (v.valueJson as unknown as object) ?? undefined,
        },
        update: {
          valueText: v.valueText ?? null,
          valueNumber: v.valueNumber ?? null,
          valueBool: v.valueBool ?? null,
          valueJson: (v.valueJson as unknown as object) ?? undefined,
        },
      });
    }
  }

  private toDto(p: {
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
    variants?: Array<{
      id: string;
      productId: string;
      sku: string;
      pricePoisha: number;
      compareAtPoisha: number | null;
      stock: number;
      isActive: boolean;
      attributeValues: unknown;
    }>;
    media?: Array<{
      id: string;
      type: string;
      url: string;
      altText: string | null;
      sortOrder: number;
      variantId: string | null;
    }>;
  }): ProductDto {
    // Summary fields — computed server-side (TDD §11.4: client never
    // computes money or stock truth).
    const activeVariants = (p.variants ?? []).filter((v) => v.isActive);
    const inStockVariants = activeVariants.filter((v) => v.stock > 0);
    const pricedVariants = inStockVariants.length > 0 ? inStockVariants : activeVariants;
    const minPricePoisha =
      pricedVariants.length > 0
        ? Math.min(...pricedVariants.map((v) => v.pricePoisha))
        : 0;
    const totalStock = activeVariants.reduce((sum, v) => sum + v.stock, 0);
    const primaryMedia = (p.media ?? [])[0];

    // Base scalar DTO — matches @ecommarce/types ProductDto.
    const base: ProductDto = {
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

    // Optional summary fields — additive, backward compatible with admin app.
    // Return type stays ProductDto; extra fields are cast once via an
    // intersection type so TypeScript accepts them without index-signature pain.
    const extra: Record<string, unknown> = {};

    if (activeVariants.length > 0) {
      extra.variants = activeVariants.map((v) => ({
        id: v.id,
        productId: v.productId,
        sku: v.sku,
        pricePoisha: v.pricePoisha,
        compareAtPoisha: v.compareAtPoisha,
        stock: v.stock,
        attributeValues: v.attributeValues,
      }));
      extra.minPricePoisha = minPricePoisha;
      extra.totalStock = totalStock;
      const firstWithCompareAt = activeVariants.find(
        (v) => typeof v.compareAtPoisha === 'number',
      );
      extra.maxCompareAtPoisha = firstWithCompareAt?.compareAtPoisha ?? null;
    }
    if (primaryMedia) {
      extra.primaryImageUrl = primaryMedia.url;
      extra.media = (p.media ?? []).map((m) => ({
        id: m.id,
        type: m.type,
        url: m.url,
        altText: m.altText,
        sortOrder: m.sortOrder,
        variantId: m.variantId,
      }));
    }

    return Object.assign(base, extra) as ProductDto;
  }
}