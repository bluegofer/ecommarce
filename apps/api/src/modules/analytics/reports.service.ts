// apps/api/src/modules/analytics/reports.service.ts
// First-party reporting built on orders + analytics_events (TDD §6.12).
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  DailySummaryRowDto,
  FunnelReportDto,
  FunnelStepDto,
  ReportQueryDto,
  SalesReportDto,
  SalesReportRowDto,
  TopProductDto,
} from '@ecommarce/types';

function parseRange(query: ReportQueryDto): { from: Date; to: Date } {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getTime() - 29 * 86400000);
  return { from, to };
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Sales summary
  // -------------------------------------------------------------------------

  async sales(query: ReportQueryDto): Promise<SalesReportDto> {
    const { from, to } = parseRange(query);

    const orders = await this.prisma.order.findMany({
      where: { placedAt: { gte: from, lte: to } },
      include: { payments: true },
    });

    const ordersCount = orders.length;
    let revenuePoisha = 0;
    let refundedPoisha = 0;
    let paidOrdersCount = 0;
    const customerIds = new Set<string>();
    for (const o of orders) {
      if (o.status !== 'CANCELLED' && o.status !== 'RETURNED') {
        revenuePoisha += o.totalPoisha;
      }
      const paid = o.payments.find((p) => p.status === 'PAID');
      if (paid) paidOrdersCount += 1;
      refundedPoisha += o.payments.reduce((s, p) => s + p.refundedPoisha, 0);
      customerIds.add(o.customerId);
    }

    // Repeat vs new — customers with > 1 order in range
    const counts = new Map<string, number>();
    for (const o of orders) {
      counts.set(o.customerId, (counts.get(o.customerId) ?? 0) + 1);
    }
    let repeatCustomers = 0;
    let newCustomers = 0;
    for (const [, n] of counts) {
      if (n > 1) repeatCustomers += 1;
      else newCustomers += 1;
    }

    const returnedOrders = orders.filter(
      (o) => o.status === 'RETURN_REQUESTED' || o.status === 'RETURNED',
    ).length;

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      ordersCount,
      paidOrdersCount,
      revenuePoisha,
      refundedPoisha,
      aovPoisha: ordersCount > 0 ? Math.floor(revenuePoisha / ordersCount) : 0,
      newCustomers,
      repeatCustomers,
      returnedOrders,
    };
  }

  // -------------------------------------------------------------------------
  // Time-series (day/week/month)
  // -------------------------------------------------------------------------

  async series(query: ReportQueryDto): Promise<SalesReportRowDto[]> {
    const { from, to } = parseRange(query);
    const groupBy = query.groupBy ?? 'day';

    const orders = await this.prisma.order.findMany({
      where: { placedAt: { gte: from, lte: to }, status: { notIn: ['CANCELLED'] } },
      select: { placedAt: true, totalPoisha: true },
    });

    const buckets = new Map<string, { count: number; revenue: number }>();
    for (const o of orders) {
      const key = this.bucketKey(o.placedAt, groupBy);
      const cur = buckets.get(key) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += o.totalPoisha;
      buckets.set(key, cur);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, v]) => ({
        date,
        ordersCount: v.count,
        revenuePoisha: v.revenue,
        aovPoisha: v.count > 0 ? Math.floor(v.revenue / v.count) : 0,
      }));
  }

  // -------------------------------------------------------------------------
  // Funnel: page view → product view → add to cart → checkout start → purchase
  // -------------------------------------------------------------------------

  async funnel(query: ReportQueryDto): Promise<FunnelReportDto> {
    const { from, to } = parseRange(query);
    const where = { createdAt: { gte: from, lte: to } };

    const [pv, pvp, atc, cks, pur] = await Promise.all([
      this.prisma.analyticsEvent.count({ where: { ...where, eventType: 'PAGE_VIEW' } }),
      this.prisma.analyticsEvent.count({ where: { ...where, eventType: 'PRODUCT_VIEW' } }),
      this.prisma.analyticsEvent.count({ where: { ...where, eventType: 'ADD_TO_CART' } }),
      this.prisma.analyticsEvent.count({ where: { ...where, eventType: 'CHECKOUT_START' } }),
      this.prisma.analyticsEvent.count({ where: { ...where, eventType: 'PURCHASE' } }),
    ]);

    const steps: FunnelStepDto[] = [
      { step: 'visit', count: pv, conversionFromPrevious: 1 },
      { step: 'product_view', count: pvp, conversionFromPrevious: pv ? pvp / pv : 0 },
      { step: 'add_to_cart', count: atc, conversionFromPrevious: pvp ? atc / pvp : 0 },
      { step: 'checkout_start', count: cks, conversionFromPrevious: atc ? cks / atc : 0 },
      { step: 'purchase', count: pur, conversionFromPrevious: cks ? pur / cks : 0 },
    ];

    return { from: from.toISOString(), to: to.toISOString(), steps };
  }

  // -------------------------------------------------------------------------
  // Top products (from delivered/non-cancelled orders in range)
  // -------------------------------------------------------------------------

  async topProducts(query: ReportQueryDto, limit = 20): Promise<TopProductDto[]> {
    const { from, to } = parseRange(query);
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: {
          placedAt: { gte: from, lte: to },
          status: { notIn: ['CANCELLED', 'RETURNED'] },
        },
      },
    });

    // Group by variant → product for title lookup
    const byVariant = new Map<string, { qty: number; revenue: number }>();
    for (const it of items) {
      const cur = byVariant.get(it.variantId) ?? { qty: 0, revenue: 0 };
      cur.qty += it.quantity;
      cur.revenue += it.lineTotalPoisha;
      byVariant.set(it.variantId, cur);
    }

    const variantIds = Array.from(byVariant.keys());
    const variants = await this.prisma.variant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { select: { id: true, titleEn: true, titleBn: true } } },
    });

    const byProduct = new Map<string, TopProductDto>();
    for (const v of variants) {
      const agg = byVariant.get(v.id);
      if (!agg) continue;
      const existing = byProduct.get(v.product.id);
      if (existing) {
        existing.unitsSold += agg.qty;
        existing.revenuePoisha += agg.revenue;
      } else {
        byProduct.set(v.product.id, {
          productId: v.product.id,
          titleEn: v.product.titleEn,
          titleBn: v.product.titleBn,
          unitsSold: agg.qty,
          revenuePoisha: agg.revenue,
        });
      }
    }

    return Array.from(byProduct.values())
      .sort((a, b) => b.revenuePoisha - a.revenuePoisha)
      .slice(0, limit);
  }

  // -------------------------------------------------------------------------
  // CSV exports
  // -------------------------------------------------------------------------

  async salesCsv(query: ReportQueryDto): Promise<string> {
    const rows = await this.series(query);
    const header = 'date,orders_count,revenue_poisha,aov_poisha';
    const lines = rows.map(
      (r) => `${r.date},${r.ordersCount},${r.revenuePoisha},${r.aovPoisha}`,
    );
    return [header, ...lines].join('\n');
  }

  async topProductsCsv(query: ReportQueryDto): Promise<string> {
    const rows = await this.topProducts(query, 200);
    const header = 'product_id,title_en,units_sold,revenue_poisha';
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = rows.map(
      (r) => `${r.productId},${esc(r.titleEn)},${r.unitsSold},${r.revenuePoisha}`,
    );
    return [header, ...lines].join('\n');
  }

  // -------------------------------------------------------------------------

  private bucketKey(d: Date, groupBy: 'day' | 'week' | 'month'): string {
    if (groupBy === 'month') {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    if (groupBy === 'week') {
      const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const day = copy.getUTCDay() || 7;
      copy.setUTCDate(copy.getUTCDate() - day + 1);
      return copy.toISOString().slice(0, 10);
    }
    return d.toISOString().slice(0, 10);
  }
}