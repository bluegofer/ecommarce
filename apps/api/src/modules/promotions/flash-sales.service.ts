// apps/api/src/modules/promotions/flash-sales.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  CreateFlashSaleDto,
  FlashSaleDto,
  FlashSaleItemDto,
  UpdateFlashSaleDto,
} from '@ecommarce/types';

@Injectable()
export class FlashSalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFlashSaleDto): Promise<FlashSaleDto> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) throw new BadRequestException('endsAt must be after startsAt');
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('at least one item required');
    }

    const created = await this.prisma.flashSale.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        startsAt,
        endsAt,
        isActive: dto.isActive ?? true,
        items: {
          create: dto.items.map((i) => ({
            variantId: i.variantId,
            dealPricePoisha: i.dealPricePoisha,
            capQuantity: i.capQuantity ?? null,
            maxPerCustomer: i.maxPerCustomer ?? null,
          })),
        },
      },
      include: { items: true },
    });
    return this.toDto(created, created.items);
  }

  async update(id: string, dto: UpdateFlashSaleDto): Promise<FlashSaleDto> {
    const current = await this.prisma.flashSale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!current) throw new NotFoundException('flash sale not found');

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.startsAt !== undefined) data.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) data.endsAt = new Date(dto.endsAt);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    await this.prisma.flashSale.update({ where: { id }, data });

    if (dto.items) {
      await this.prisma.flashSaleItem.deleteMany({ where: { flashSaleId: id } });
      await this.prisma.flashSaleItem.createMany({
        data: dto.items.map((i) => ({
          flashSaleId: id,
          variantId: i.variantId,
          dealPricePoisha: i.dealPricePoisha,
          capQuantity: i.capQuantity ?? null,
          maxPerCustomer: i.maxPerCustomer ?? null,
        })),
      });
    }

    return this.findOne(id);
  }

  async findOne(id: string): Promise<FlashSaleDto> {
    const fs = await this.prisma.flashSale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!fs) throw new NotFoundException('flash sale not found');
    return this.toDto(fs, fs.items);
  }

  async list(): Promise<FlashSaleDto[]> {
    const rows = await this.prisma.flashSale.findMany({
      orderBy: { startsAt: 'desc' },
      include: { items: true },
    });
    return rows.map((r) => this.toDto(r, r.items));
  }

  /**
   * Public storefront view: only sales that are active AND within their window.
   */
  async listActive(): Promise<FlashSaleDto[]> {
    const now = new Date();
    const rows = await this.prisma.flashSale.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      orderBy: { endsAt: 'asc' },
      include: { items: true },
    });
    return rows.map((r) => this.toDto(r, r.items));
  }

  async remove(id: string): Promise<{ ok: true }> {
    const fs = await this.prisma.flashSale.findUnique({ where: { id } });
    if (!fs) throw new NotFoundException('flash sale not found');
    await this.prisma.flashSale.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Called by the scheduler every minute:
   *   - deactivate sales whose endsAt passed
   *   - (activation is implicit — listActive filters by window)
   * Returns counts for logging.
   */
  async tick(now: Date = new Date()): Promise<{ expired: number }> {
    const result = await this.prisma.flashSale.updateMany({
      where: { isActive: true, endsAt: { lt: now } },
      data: { isActive: false },
    });
    return { expired: result.count };
  }

  /**
   * Conditional sold-quantity increment. Returns false if cap reached.
   */
  async tryClaimItem(flashSaleItemId: string, quantity: number): Promise<boolean> {
    if (quantity <= 0) return false;
    const result = await this.prisma.$executeRaw`
      UPDATE flash_sale_items
      SET "soldQuantity" = "soldQuantity" + ${quantity}, "updatedAt" = NOW()
      WHERE id = ${flashSaleItemId}
        AND ("capQuantity" IS NULL OR "soldQuantity" + ${quantity} <= "capQuantity")
    `;
    return result === 1;
  }

  private toDto(
    fs: {
      id: string;
      name: string;
      description: string | null;
      startsAt: Date;
      endsAt: Date;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    items: Array<{
      id: string;
      flashSaleId: string;
      variantId: string;
      dealPricePoisha: number;
      capQuantity: number | null;
      soldQuantity: number;
      maxPerCustomer: number | null;
    }>,
  ): FlashSaleDto {
    const itemDtos: FlashSaleItemDto[] = items.map((i) => ({
      id: i.id,
      flashSaleId: i.flashSaleId,
      variantId: i.variantId,
      dealPricePoisha: i.dealPricePoisha,
      capQuantity: i.capQuantity,
      soldQuantity: i.soldQuantity,
      maxPerCustomer: i.maxPerCustomer,
      percentClaimed:
        i.capQuantity && i.capQuantity > 0
          ? Math.min(100, Math.floor((i.soldQuantity / i.capQuantity) * 100))
          : 0,
    }));
    return {
      id: fs.id,
      name: fs.name,
      description: fs.description,
      startsAt: fs.startsAt.toISOString(),
      endsAt: fs.endsAt.toISOString(),
      isActive: fs.isActive,
      createdAt: fs.createdAt.toISOString(),
      updatedAt: fs.updatedAt.toISOString(),
      items: itemDtos,
    };
  }
}