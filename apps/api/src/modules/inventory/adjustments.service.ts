// apps/api/src/modules/inventory/adjustments.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AdjustStockDto, AdjustmentReason, InventoryAdjustmentDto } from '@ecommarce/types';

@Injectable()
export class AdjustmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async adjust(
    dto: AdjustStockDto,
    actorUserId: string | null,
  ): Promise<InventoryAdjustmentDto> {
    if (dto.delta === 0) throw new BadRequestException('delta cannot be 0');

    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.variant.findUnique({
        where: { id: dto.variantId },
        select: { stock: true },
      });
      if (!variant) throw new NotFoundException('variant not found');

      const stockBefore = variant.stock;
      const stockAfter = stockBefore + dto.delta;
      if (stockAfter < 0) {
        throw new BadRequestException('adjustment would push stock below 0');
      }

      await tx.variant.update({
        where: { id: dto.variantId },
        data: { stock: stockAfter },
      });

      const row = await tx.inventoryAdjustment.create({
        data: {
          variantId: dto.variantId,
          warehouseId: dto.warehouseId ?? null,
          delta: dto.delta,
          reason: dto.reason,
          reasonNote: dto.reasonNote ?? null,
          stockBefore,
          stockAfter,
          actorUserId,
          referenceId: dto.referenceId ?? null,
        },
      });

      return {
        id: row.id,
        variantId: row.variantId,
        warehouseId: row.warehouseId,
        delta: row.delta,
        reason: row.reason as AdjustmentReason,
        reasonNote: row.reasonNote,
        stockBefore: row.stockBefore,
        stockAfter: row.stockAfter,
        actorUserId: row.actorUserId,
        referenceId: row.referenceId,
        createdAt: row.createdAt.toISOString(),
      };
    });
  }

  async listByVariant(variantId: string, limit = 100): Promise<InventoryAdjustmentDto[]> {
    const rows = await this.prisma.inventoryAdjustment.findMany({
      where: { variantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      variantId: r.variantId,
      warehouseId: r.warehouseId,
      delta: r.delta,
      reason: r.reason as AdjustmentReason,
      reasonNote: r.reasonNote,
      stockBefore: r.stockBefore,
      stockAfter: r.stockAfter,
      actorUserId: r.actorUserId,
      referenceId: r.referenceId,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async valuationCsv(): Promise<string> {
    const rows = await this.prisma.variant.findMany({
      where: { isActive: true },
      include: { product: { select: { titleEn: true, slug: true } } },
      orderBy: { sku: 'asc' },
    });
    const header = 'sku,product_title,stock,unit_price_poisha,stock_value_poisha';
    const lines = rows.map((r) => {
      const safeTitle = r.product.titleEn.replace(/[",\n]/g, ' ');
      const value = r.stock * r.pricePoisha;
      return r.sku + ',"' + safeTitle + '",' + r.stock + ',' + r.pricePoisha + ',' + value;
    });
    return [header, ...lines].join('\n');
  }
}