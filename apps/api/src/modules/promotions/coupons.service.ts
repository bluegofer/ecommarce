// apps/api/src/modules/promotions/coupons.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  CouponDto,
  CouponType,
  CreateCouponDto,
  UpdateCouponDto,
} from '@ecommarce/types';
import type { Coupon } from '@prisma/client';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCouponDto): Promise<CouponDto> {
    const code = dto.code.toUpperCase().trim();
    if (!code) throw new BadRequestException('code required');

    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) throw new BadRequestException(`code already exists: ${code}`);

    if (dto.type === 'PERCENTAGE') {
      if (dto.valuePercent === undefined || dto.valuePercent < 1 || dto.valuePercent > 100) {
        throw new BadRequestException('valuePercent must be 1-100');
      }
    }
    if (dto.type === 'FIXED') {
      if (dto.valuePoisha === undefined || dto.valuePoisha < 1) {
        throw new BadRequestException('valuePoisha must be >= 1');
      }
    }

    const created = await this.prisma.coupon.create({
      data: {
        code,
        type: dto.type,
        valuePercent: dto.valuePercent ?? null,
        valuePoisha: dto.valuePoisha ?? null,
        minOrderPoisha: dto.minOrderPoisha ?? 0,
        maxDiscountPoisha: dto.maxDiscountPoisha ?? null,
        totalUsageLimit: dto.totalUsageLimit ?? null,
        perCustomerLimit: dto.perCustomerLimit ?? null,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        firstOrderOnly: dto.firstOrderOnly ?? false,
        combinable: dto.combinable ?? false,
        isActive: dto.isActive ?? true,
        descriptionEn: dto.descriptionEn ?? null,
        descriptionBn: dto.descriptionBn ?? null,
        rulesJson:
          dto.scopeJson !== undefined
            ? (dto.scopeJson as unknown as object)
            : undefined,
      },
    });
    return this.toDto(created);
  }

  async update(id: string, dto: UpdateCouponDto): Promise<CouponDto> {
    const current = await this.prisma.coupon.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('coupon not found');

    const data: Record<string, unknown> = {};
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.valuePercent !== undefined) data.valuePercent = dto.valuePercent;
    if (dto.valuePoisha !== undefined) data.valuePoisha = dto.valuePoisha;
    if (dto.minOrderPoisha !== undefined) data.minOrderPoisha = dto.minOrderPoisha;
    if (dto.maxDiscountPoisha !== undefined) data.maxDiscountPoisha = dto.maxDiscountPoisha;
    if (dto.totalUsageLimit !== undefined) data.totalUsageLimit = dto.totalUsageLimit;
    if (dto.perCustomerLimit !== undefined) data.perCustomerLimit = dto.perCustomerLimit;
    if (dto.validFrom !== undefined) data.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    if (dto.validUntil !== undefined) data.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    if (dto.firstOrderOnly !== undefined) data.firstOrderOnly = dto.firstOrderOnly;
    if (dto.combinable !== undefined) data.combinable = dto.combinable;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.descriptionEn !== undefined) data.descriptionEn = dto.descriptionEn;
    if (dto.descriptionBn !== undefined) data.descriptionBn = dto.descriptionBn;
    if (dto.scopeJson !== undefined) data.rulesJson = dto.scopeJson;

    const updated = await this.prisma.coupon.update({ where: { id }, data });
    return this.toDto(updated);
  }

  async findOne(id: string): Promise<CouponDto> {
    const c = await this.prisma.coupon.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('coupon not found');
    return this.toDto(c);
  }

  async findByCode(code: string): Promise<CouponDto | null> {
    const c = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    return c ? this.toDto(c) : null;
  }

  async list(): Promise<CouponDto[]> {
    const rows = await this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((c) => this.toDto(c));
  }

  async remove(id: string): Promise<{ ok: true }> {
    const c = await this.prisma.coupon.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('coupon not found');
    await this.prisma.coupon.delete({ where: { id } });
    return { ok: true };
  }

  private toDto(c: Coupon): CouponDto {
    return {
      id: c.id,
      code: c.code,
      type: c.type as CouponType,
      valuePercent: c.valuePercent,
      valuePoisha: c.valuePoisha,
      minOrderPoisha: c.minOrderPoisha,
      maxDiscountPoisha: c.maxDiscountPoisha,
      totalUsageLimit: c.totalUsageLimit,
      perCustomerLimit: c.perCustomerLimit,
      timesRedeemed: c.timesRedeemed,
      validFrom: c.validFrom ? c.validFrom.toISOString() : null,
      validUntil: c.validUntil ? c.validUntil.toISOString() : null,
      firstOrderOnly: c.firstOrderOnly,
      combinable: c.combinable,
      isActive: c.isActive,
      descriptionEn: c.descriptionEn,
      descriptionBn: c.descriptionBn,
      scopeJson: (c.rulesJson as CouponDto['scopeJson']) ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}