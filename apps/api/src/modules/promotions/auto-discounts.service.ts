// apps/api/src/modules/promotions/auto-discounts.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  AutomaticDiscountDto,
  CouponType,
  CreateAutomaticDiscountDto,
  DiscountScope,
  UpdateAutomaticDiscountDto,
} from '@ecommarce/types';
import type { AutomaticDiscount } from '@prisma/client';

@Injectable()
export class AutoDiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAutomaticDiscountDto): Promise<AutomaticDiscountDto> {
    const created = await this.prisma.automaticDiscount.create({
      data: {
        name: dto.name,
        type: dto.type,
        scope: dto.scope ?? 'ORDER',
        valuePercent: dto.valuePercent ?? null,
        valuePoisha: dto.valuePoisha ?? null,
        minOrderPoisha: dto.minOrderPoisha ?? 0,
        maxDiscountPoisha: dto.maxDiscountPoisha ?? null,
        scopeJson:
          dto.scopeJson !== undefined ? (dto.scopeJson as unknown as object) : undefined,
        priority: dto.priority ?? 0,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        isActive: dto.isActive ?? true,
      },
    });
    return this.toDto(created);
  }

  async update(id: string, dto: UpdateAutomaticDiscountDto): Promise<AutomaticDiscountDto> {
    const current = await this.prisma.automaticDiscount.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('auto discount not found');

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.scope !== undefined) data.scope = dto.scope;
    if (dto.valuePercent !== undefined) data.valuePercent = dto.valuePercent;
    if (dto.valuePoisha !== undefined) data.valuePoisha = dto.valuePoisha;
    if (dto.minOrderPoisha !== undefined) data.minOrderPoisha = dto.minOrderPoisha;
    if (dto.maxDiscountPoisha !== undefined) data.maxDiscountPoisha = dto.maxDiscountPoisha;
    if (dto.scopeJson !== undefined) data.scopeJson = dto.scopeJson;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.validFrom !== undefined) data.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    if (dto.validUntil !== undefined) data.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.automaticDiscount.update({ where: { id }, data });
    return this.toDto(updated);
  }

  async list(): Promise<AutomaticDiscountDto[]> {
    const rows = await this.prisma.automaticDiscount.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.toDto(r));
  }

  async findOne(id: string): Promise<AutomaticDiscountDto> {
    const r = await this.prisma.automaticDiscount.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('auto discount not found');
    return this.toDto(r);
  }

  async remove(id: string): Promise<{ ok: true }> {
    const r = await this.prisma.automaticDiscount.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('auto discount not found');
    await this.prisma.automaticDiscount.delete({ where: { id } });
    return { ok: true };
  }

  private toDto(r: AutomaticDiscount): AutomaticDiscountDto {
    return {
      id: r.id,
      name: r.name,
      type: r.type as CouponType,
      scope: r.scope as DiscountScope,
      valuePercent: r.valuePercent,
      valuePoisha: r.valuePoisha,
      minOrderPoisha: r.minOrderPoisha,
      maxDiscountPoisha: r.maxDiscountPoisha,
      scopeJson: (r.scopeJson as AutomaticDiscountDto['scopeJson']) ?? null,
      priority: r.priority,
      validFrom: r.validFrom ? r.validFrom.toISOString() : null,
      validUntil: r.validUntil ? r.validUntil.toISOString() : null,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}