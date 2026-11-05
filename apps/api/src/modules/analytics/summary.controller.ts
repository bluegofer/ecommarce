// apps/api/src/modules/analytics/summary.controller.ts
import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DailySummaryService } from './daily-summary.service';
import { PrismaService } from '../../database/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('analytics')
@Controller('analytics/summary')
export class SummaryController {
  constructor(
    private readonly svc: DailySummaryService,
    private readonly prisma: PrismaService,
  ) {}

  @Roles('SUPER_ADMIN', 'FINANCE_READONLY')
  @Get('daily')
  async daily(@Query('from') from?: string, @Query('to') to?: string) {
    const f = from ? new Date(from) : new Date(Date.now() - 29 * 86400000);
    const t = to ? new Date(to) : new Date();
    return this.prisma.dailySalesSummary.findMany({
      where: { date: { gte: f, lte: t } },
      orderBy: { date: 'asc' },
    });
  }

  @Roles('SUPER_ADMIN')
  @Post('materialize')
  async materialize(@Query('from') from?: string, @Query('to') to?: string) {
    const f = from ? new Date(from) : new Date(Date.now() - 29 * 86400000);
    const t = to ? new Date(to) : new Date();
    return this.svc.materializeRange(f, t);
  }
}