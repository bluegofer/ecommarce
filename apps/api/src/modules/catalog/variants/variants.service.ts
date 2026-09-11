// apps/api/src/modules/catalog/variants/variants.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type {
  CreateVariantDto,
  UpdateVariantDto,
  VariantDto,
  VariantMatrixRequestDto,
} from '@ecommarce/types';

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByProduct(productId: string): Promise<VariantDto[]> {
    const rows = await this.prisma.variant.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async findOne(id: string): Promise<VariantDto> {
    const row = await this.prisma.variant.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('variant not found');
    return this.toDto(row);
  }

  async create(productId: string, dto: CreateVariantDto): Promise<VariantDto> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('product not found');

    const dup = await this.prisma.variant.findUnique({ where: { sku: dto.sku } });
    if (dup) throw new BadRequestException('sku already exists: ' + dto.sku);

    const created = await this.prisma.variant.create({
      data: {
        productId,
        warehouseId: dto.warehouseId ?? null,
        sku: dto.sku,
        barcode: dto.barcode ?? null,
        pricePoisha: dto.pricePoisha,
        compareAtPoisha: dto.compareAtPoisha ?? null,
        stock: dto.stock ?? 0,
        lowStockThreshold: dto.lowStockThreshold ?? 5,
        attributeValues: dto.attributeValues as unknown as object,
        isActive: dto.isActive ?? true,
      },
    });
    return this.toDto(created);
  }

  async update(id: string, dto: UpdateVariantDto): Promise<VariantDto> {
    const current = await this.prisma.variant.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('variant not found');

    const data: Record<string, unknown> = {};
    if (dto.sku !== undefined) data.sku = dto.sku;
    if (dto.barcode !== undefined) data.barcode = dto.barcode;
    if (dto.pricePoisha !== undefined) data.pricePoisha = dto.pricePoisha;
    if (dto.compareAtPoisha !== undefined) data.compareAtPoisha = dto.compareAtPoisha;
    if (dto.lowStockThreshold !== undefined) data.lowStockThreshold = dto.lowStockThreshold;
    if (dto.attributeValues !== undefined) data.attributeValues = dto.attributeValues;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.warehouseId !== undefined) data.warehouseId = dto.warehouseId;

    const updated = await this.prisma.variant.update({ where: { id }, data });
    return this.toDto(updated);
  }

  async remove(id: string): Promise<{ ok: true }> {
    const row = await this.prisma.variant.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('variant not found');
    await this.prisma.variant.delete({ where: { id } });
    return { ok: true };
  }

  async generateMatrix(req: VariantMatrixRequestDto): Promise<VariantDto[]> {
    const product = await this.prisma.product.findUnique({ where: { id: req.productId } });
    if (!product) throw new NotFoundException('product not found');
    if (req.axes.length === 0) throw new BadRequestException('at least one axis required');

    const combos = this.cartesian(req.axes.map((a) => a.values));
    const axes = req.axes;
    const prefix = req.skuPrefix ?? product.slug.toUpperCase().replace(/-/g, '').slice(0, 12);
    const existing = await this.prisma.variant.findMany({
      where: { productId: req.productId },
      select: { sku: true },
    });
    const taken = new Set(existing.map((e) => e.sku));

    const toCreate: Array<{
      productId: string;
      sku: string;
      pricePoisha: number;
      compareAtPoisha: number | null;
      stock: number;
      attributeValues: Record<string, string>;
    }> = [];

    for (const combo of combos) {
      const attributeValues: Record<string, string> = {};
      for (let i = 0; i < axes.length; i += 1) {
        const axis = axes[i];
        const value = combo[i];
        if (!axis || value === undefined) continue;
        attributeValues[axis.attributeSlug] = value;
      }
      const suffix = combo
        .map((v) => v.toUpperCase().replace(/\s+/g, ''))
        .join('-');
      let sku = prefix + '-' + suffix;
      let counter = 1;
      while (taken.has(sku)) {
        sku = prefix + '-' + suffix + '-' + counter;
        counter += 1;
      }
      taken.add(sku);

      toCreate.push({
        productId: req.productId,
        sku,
        pricePoisha: req.basePricePoisha,
        compareAtPoisha: req.baseCompareAtPoisha ?? null,
        stock: req.defaultStock ?? 0,
        attributeValues,
      });
    }

    const created: VariantDto[] = [];
    for (const item of toCreate) {
      const row = await this.prisma.variant.create({
        data: {
          productId: item.productId,
          sku: item.sku,
          pricePoisha: item.pricePoisha,
          compareAtPoisha: item.compareAtPoisha,
          stock: item.stock,
          lowStockThreshold: 5,
          attributeValues: item.attributeValues as unknown as object,
          isActive: true,
        },
      });
      created.push(this.toDto(row));
    }
    return created;
  }

  private cartesian(arrays: string[][]): string[][] {
    if (arrays.length === 0) return [[]];
    const head = arrays[0] ?? [];
    const rest = arrays.slice(1);
    const tail = this.cartesian(rest);
    const out: string[][] = [];
    for (const h of head) {
      for (const t of tail) {
        out.push([h, ...t]);
      }
    }
    return out;
  }

  private toDto(row: {
    id: string;
    productId: string;
    warehouseId: string | null;
    sku: string;
    barcode: string | null;
    pricePoisha: number;
    compareAtPoisha: number | null;
    stock: number;
    lowStockThreshold: number;
    attributeValues: unknown;
    isActive: boolean;
  }): VariantDto {
    return {
      id: row.id,
      productId: row.productId,
      warehouseId: row.warehouseId,
      sku: row.sku,
      barcode: row.barcode,
      pricePoisha: row.pricePoisha,
      compareAtPoisha: row.compareAtPoisha,
      stock: row.stock,
      lowStockThreshold: row.lowStockThreshold,
      attributeValues:
        row.attributeValues && typeof row.attributeValues === 'object'
          ? (row.attributeValues as Record<string, string>)
          : {},
      isActive: row.isActive,
    };
  }
}