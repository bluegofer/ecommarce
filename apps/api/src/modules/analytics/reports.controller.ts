// apps/api/src/modules/analytics/reports.controller.ts
import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/decorators/roles.decorator';
import type { ReportQueryDto } from '@ecommarce/types';
import type { Response } from 'express';

@ApiTags('analytics')
@Controller('analytics/reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Roles('SUPER_ADMIN', 'FINANCE_READONLY', 'MARKETING_MANAGER')
  @Get('sales')
  sales(@Query() query: ReportQueryDto) {
    return this.svc.sales(query);
  }

  @Roles('SUPER_ADMIN', 'FINANCE_READONLY', 'MARKETING_MANAGER')
  @Get('series')
  series(@Query() query: ReportQueryDto) {
    return this.svc.series(query);
  }

  @Roles('SUPER_ADMIN', 'FINANCE_READONLY', 'MARKETING_MANAGER')
  @Get('funnel')
  funnel(@Query() query: ReportQueryDto) {
    return this.svc.funnel(query);
  }

  @Roles('SUPER_ADMIN', 'FINANCE_READONLY', 'MARKETING_MANAGER')
  @Get('top-products')
  topProducts(@Query() query: ReportQueryDto) {
    return this.svc.topProducts(query);
  }

  @Roles('SUPER_ADMIN', 'FINANCE_READONLY', 'MARKETING_MANAGER')
  @Get('sales.csv')
  async salesCsv(@Query() query: ReportQueryDto, @Res() res: Response) {
    const csv = await this.svc.salesCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sales-report.csv"');
    res.send(csv);
  }

  @Roles('SUPER_ADMIN', 'FINANCE_READONLY', 'MARKETING_MANAGER')
  @Get('top-products.csv')
  async topProductsCsv(@Query() query: ReportQueryDto, @Res() res: Response) {
    const csv = await this.svc.topProductsCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="top-products.csv"');
    res.send(csv);
  }
}