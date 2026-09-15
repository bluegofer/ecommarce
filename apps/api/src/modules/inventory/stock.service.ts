// apps/api/src/modules/inventory/stock.service.ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { LowStockItemDto } from '@ecommarce/types';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async tryDecrement(variantId: string, quantity: number): Promise<boolean> {
    if (quantity <= 0) throw new ConflictException('quantity must be > 0');
    const result = await this.prisma.$executeRaw`
      UPDATE variants
      SET stock = stock - ${quantity}, "updatedAt" = NOW()
      WHERE id = ${variantId} AND stock >= ${quantity}
    `;
    return result === 1;
  }

  async decrementOrThrow(variantId: string, quantity: number): Promise<void> {
    const ok = await this.tryDecrement(variantId, quantity);
    if (!ok) {
      const v = await this.prisma.variant.findUnique({ where: { id: variantId } });
      if (!v) throw new NotFoundException('variant not found');
      throw new ConflictException(
        'insufficient stock for ' + v.sku + ': have ' + v.stock + ', need ' + quantity,
      );
    }
  }

  async increment(variantId: string, quantity: number): Promise<void> {
    if (quantity <= 0) throw new ConflictException('quantity must be > 0');
    const result = await this.prisma.$executeRaw`
      UPDATE variants
      SET stock = stock + ${quantity}, "updatedAt" = NOW()
      WHERE id = ${variantId}
    `;
    if (result !== 1) throw new NotFoundException('variant not found');
  }

  async getStock(variantId: string): Promise<number> {
    const v = await this.prisma.variant.findUnique({
      where: { id: variantId },
      select: { stock: true },
    });
    if (!v) throw new NotFoundException('variant not found');
    return v.stock;
  }

  async lowStockList(): Promise<LowStockItemDto[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        variantId: string;
        productId: string;
        sku: string;
        stock: number;
        lowStockThreshold: number;
        titleEn: string;
        titleBn: string;
      }>
    >`
      SELECT v.id AS "variantId", v."productId" AS "productId", v.sku AS sku,
             v.stock AS stock, v."lowStockThreshold" AS "lowStockThreshold",
             p."titleEn" AS "titleEn", p."titleBn" AS "titleBn"
      FROM variants v
      JOIN products p ON p.id = v."productId"
      WHERE v.stock <= v."lowStockThreshold" AND v."isActive" = true
      ORDER BY v.stock ASC, v.sku ASC
      LIMIT 500
    `;
    return rows;
  }
}