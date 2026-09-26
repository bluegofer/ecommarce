// apps/api/src/modules/promotions/reports.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { CouponPerformanceDto } from '@ecommarce/types';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async couponPerformance(couponId: string): Promise<CouponPerformanceDto> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) throw new NotFoundException('coupon not found');

    const rows = await this.prisma.couponRedemption.findMany({
      where: { couponId },
      orderBy: { redeemedAt: 'asc' },
    });

    const totalDiscount = rows.reduce((s, r) => s + r.discountPoisha, 0);
    const uniq = new Set(rows.map((r) => r.userId));
    const firstRow = rows[0];
    const lastRow = rows[rows.length - 1];

    return {
      couponId: coupon.id,
      code: coupon.code,
      timesRedeemed: rows.length,
      totalDiscountPoisha: totalDiscount,
      uniqueCustomers: uniq.size,
      firstRedeemedAt: firstRow ? firstRow.redeemedAt.toISOString() : null,
      lastRedeemedAt: lastRow ? lastRow.redeemedAt.toISOString() : null,
    };
  }

  async allCouponPerformance(): Promise<CouponPerformanceDto[]> {
    const coupons = await this.prisma.coupon.findMany();
    const out: CouponPerformanceDto[] = [];
    for (const c of coupons) {
      const rows = await this.prisma.couponRedemption.findMany({ where: { couponId: c.id } });
      const total = rows.reduce((s, r) => s + r.discountPoisha, 0);
      const uniq = new Set(rows.map((r) => r.userId));

      let first: Date | null = null;
      let last: Date | null = null;
      for (const r of rows) {
        if (first === null || r.redeemedAt < first) first = r.redeemedAt;
        if (last === null || r.redeemedAt > last) last = r.redeemedAt;
      }

      out.push({
        couponId: c.id,
        code: c.code,
        timesRedeemed: rows.length,
        totalDiscountPoisha: total,
        uniqueCustomers: uniq.size,
        firstRedeemedAt: first ? first.toISOString() : null,
        lastRedeemedAt: last ? last.toISOString() : null,
      });
    }
    return out;
  }
}