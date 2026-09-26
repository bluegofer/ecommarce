// apps/api/src/modules/analytics/dashboard.controller.ts
//
// Dashboard home endpoint — single aggregated call for the admin landing page.
// TDD §6.13 "Dashboard home: today's sales/orders, pending actions".
//
// Returns real numbers (no materialization lag for "today"); pending-action
// counts come from live table scans (all small, indexed counts).
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';

export interface DashboardDto {
  today: {
    grossSalesPoisha: number;
    ordersCount: number;
  };
  pendingActions: {
    pendingVerification: number;
    lowStockSkus: number;
    returnsAwaiting: number;
    unreconciledSettlements: number;
  };
}

@ApiTags('analytics')
@Controller('analytics/dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Roles('SUPER_ADMIN', 'FINANCE_READONLY', 'ORDER_SUPPORT', 'MARKETING_MANAGER')
  @Get()
  async dashboard(): Promise<DashboardDto> {
    // "Today" = UTC day start. Matches DailySummaryService.materializeFor().
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [
      todayAgg,
      pendingVerification,
      lowStockRows,
      returnsAwaiting,
      unreconciledSettlements,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          placedAt: { gte: todayStart },
          status: { notIn: ['CANCELLED', 'RETURNED'] },
        },
        _sum: { totalPoisha: true },
        _count: { _all: true },
      }),

      this.prisma.order.count({
        where: { status: 'PENDING_VERIFICATION' },
      }),

      // Cross-field comparison (stock <= lowStockThreshold) — needs raw SQL.
      // Prisma query builder cannot express column-vs-column filters.
      this.prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM variants
        WHERE "isActive" = true AND "stock" <= "lowStockThreshold"
      `,

      this.prisma.order.count({
        where: { status: 'RETURN_REQUESTED' },
      }),

      // Courier settlement reconciliation (A.4) — placeholder 0 until the
      // settlement module lands in Custom Phase 7; keep the field so the
      // admin UI can bind it without a shape change later.
      Promise.resolve(0),
    ]);

    return {
      today: {
        grossSalesPoisha: todayAgg._sum.totalPoisha ?? 0,
        ordersCount: todayAgg._count._all,
      },
      pendingActions: {
        pendingVerification,
        lowStockSkus: lowStockRows[0]?.count ?? 0,
        returnsAwaiting,
        unreconciledSettlements,
      },
    };
  }
}