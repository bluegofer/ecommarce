// apps/api/src/modules/analytics/daily-summary.service.ts
// Materialize DailySalesSummary rows + optionally send a morning digest.
// Runs on demand (via controller) and on an interval (in-process; Step 12
// swaps the timer for EventBridge invoking the same method).
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const INTERVAL_MS = 60 * 60 * 1000; // hourly check

@Injectable()
export class DailySummaryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DailySummaryService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.materializeYesterday().catch((err) =>
        this.logger.error('daily summary tick failed', err as Error),
      );
    }, INTERVAL_MS);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Recompute the summary row for a given date (UTC).
   * Idempotent — safe to run many times.
   */
  async materializeFor(date: Date): Promise<void> {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const end = new Date(start.getTime() + 86400000);

    const orders = await this.prisma.order.findMany({
      where: { placedAt: { gte: start, lt: end } },
      include: { payments: true },
    });

    const ordersCount = orders.length;
    let paidOrdersCount = 0;
    let revenuePoisha = 0;
    let refundedPoisha = 0;
    let returnedOrders = 0;
    const counts = new Map<string, number>();
    for (const o of orders) {
      if (o.status !== 'CANCELLED' && o.status !== 'RETURNED') {
        revenuePoisha += o.totalPoisha;
      }
      if (o.payments.some((p) => p.status === 'PAID')) paidOrdersCount += 1;
      refundedPoisha += o.payments.reduce((s, p) => s + p.refundedPoisha, 0);
      if (o.status === 'RETURN_REQUESTED' || o.status === 'RETURNED') returnedOrders += 1;
      counts.set(o.customerId, (counts.get(o.customerId) ?? 0) + 1);
    }

    let uniqueCustomers = 0;
    let repeatCustomers = 0;
    let newCustomers = 0;
    for (const [, n] of counts) {
      uniqueCustomers += 1;
      if (n > 1) repeatCustomers += 1;
      else newCustomers += 1;
    }

    const aovPoisha = ordersCount > 0 ? Math.floor(revenuePoisha / ordersCount) : 0;

    await this.prisma.dailySalesSummary.upsert({
      where: { date: start },
      create: {
        date: start,
        ordersCount,
        paidOrdersCount,
        revenuePoisha,
        refundedPoisha,
        aovPoisha,
        uniqueCustomers,
        repeatCustomers,
        newCustomers,
        returnedOrders,
      },
      update: {
        ordersCount,
        paidOrdersCount,
        revenuePoisha,
        refundedPoisha,
        aovPoisha,
        uniqueCustomers,
        repeatCustomers,
        newCustomers,
        returnedOrders,
      },
    });
  }

  async materializeYesterday(): Promise<void> {
    const y = new Date(Date.now() - 86400000);
    await this.materializeFor(y);
  }

  async materializeRange(from: Date, to: Date): Promise<{ days: number }> {
    let days = 0;
    for (let t = from.getTime(); t <= to.getTime(); t += 86400000) {
      await this.materializeFor(new Date(t));
      days += 1;
    }
    return { days };
  }
}