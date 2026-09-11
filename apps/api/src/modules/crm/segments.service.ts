// apps/api/src/modules/crm/segments.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  CreateSegmentDto,
  SegmentDto,
  SegmentFilterDto,
  UpdateSegmentDto,
} from '@ecommarce/types';
import type { Prisma } from '@prisma/client';

@Injectable()
export class SegmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSegmentDto): Promise<SegmentDto> {
    const s = await this.prisma.segment.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        filterJson: dto.filterJson as unknown as object,
        isActive: dto.isActive ?? true,
      },
    });
    await this.refresh(s.id);
    return this.findOne(s.id);
  }

  async update(id: string, dto: UpdateSegmentDto): Promise<SegmentDto> {
    const cur = await this.prisma.segment.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException('segment not found');
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.filterJson !== undefined) data.filterJson = dto.filterJson;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    await this.prisma.segment.update({ where: { id }, data });
    await this.refresh(id);
    return this.findOne(id);
  }

  async list(): Promise<SegmentDto[]> {
    const rows = await this.prisma.segment.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((r) => this.toDto(r));
  }

  async findOne(id: string): Promise<SegmentDto> {
    const s = await this.prisma.segment.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('segment not found');
    return this.toDto(s);
  }

  async remove(id: string): Promise<{ ok: true }> {
    await this.prisma.segment.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Re-evaluate estimatedCount for one segment.
   * Called on demand and by a background job in Step 6.
   */
  async refresh(id: string): Promise<{ ok: true; count: number }> {
    const s = await this.prisma.segment.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('segment not found');
    const filter = s.filterJson as SegmentFilterDto;
    const where = this.buildWhere(filter);

    const count = await this.prisma.customer.count({ where });
    await this.prisma.segment.update({
      where: { id },
      data: { estimatedCount: count, refreshedAt: new Date() },
    });
    return { ok: true, count };
  }

  async members(id: string, limit = 200) {
    const s = await this.prisma.segment.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('segment not found');
    const filter = s.filterJson as SegmentFilterDto;
    const where = this.buildWhere(filter);
    return this.prisma.customer.findMany({
      where,
      orderBy: { lastOrderAt: { sort: 'desc', nulls: 'last' } },
      take: limit,
    });
  }

  private buildWhere(filter: SegmentFilterDto): Prisma.CustomerWhereInput {
    const where: Prisma.CustomerWhereInput = {};
    const and: Prisma.CustomerWhereInput[] = [];

    if (typeof filter.minOrders === 'number') {
      and.push({ totalOrders: { gte: filter.minOrders } });
    }
    if (typeof filter.minSpendPoisha === 'number') {
      and.push({ totalSpentPoisha: { gte: filter.minSpendPoisha } });
    }
    if (typeof filter.lastOrderWithinDays === 'number') {
      const since = new Date(Date.now() - filter.lastOrderWithinDays * 86400000);
      and.push({ lastOrderAt: { gte: since } });
    }
    if (typeof filter.noOrderInDays === 'number') {
      const before = new Date(Date.now() - filter.noOrderInDays * 86400000);
      and.push({
        OR: [{ lastOrderAt: null }, { lastOrderAt: { lt: before } }],
      });
    }
    if (typeof filter.isGuest === 'boolean') {
      and.push({ isGuest: filter.isGuest });
    }
    if (filter.city) {
      and.push({ addresses: { some: { city: filter.city } } });
    }

    if (and.length > 0) where.AND = and;
    return where;
  }

  private toDto(s: {
    id: string;
    name: string;
    description: string | null;
    filterJson: unknown;
    isActive: boolean;
    estimatedCount: number;
    refreshedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): SegmentDto {
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      filterJson: s.filterJson as SegmentFilterDto,
      isActive: s.isActive,
      estimatedCount: s.estimatedCount,
      refreshedAt: s.refreshedAt ? s.refreshedAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }
}