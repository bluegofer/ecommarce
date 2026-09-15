import {
  Controller, Post, Get, Body, Param, Query, UseGuards, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PosService } from './pos.service';
import { PosReturnsService } from './pos-returns.service';
import { PosReportsService } from './pos-reports.service';
import {
  OpenSessionDto, CloseSessionDto, CashEventDto,
  CreatePosSaleDto, CreateStockTransferDto,
} from './dto';

// NOTE: JwtAuthGuard is registered globally via APP_GUARD in app.module.ts
@Controller('pos')
@UseGuards(RolesGuard)
export class PosController {
  constructor(
    private readonly pos: PosService,
    private readonly returns: PosReturnsService,
    private readonly reports: PosReportsService,
  ) {}

  // -------- SESSIONS --------

  @Post('sessions/open')
  @Roles('SUPER_ADMIN', 'STORE_POS_STAFF')
  openSession(
    @Body() dto: OpenSessionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.pos.openSession(dto, userId);
  }

  @Post('sessions/:id/close')
  @Roles('SUPER_ADMIN', 'STORE_POS_STAFF')
  closeSession(
    @Param('id') id: string,
    @Body() dto: CloseSessionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.pos.closeSession(id, dto, userId);
  }

  @Post('sessions/:id/cash-event')
  @Roles('SUPER_ADMIN', 'STORE_POS_STAFF')
  cashEvent(
    @Param('id') id: string,
    @Body() dto: CashEventDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.pos.recordCashEvent(id, dto, userId);
  }

  // -------- SALES --------

  @Post('sales')
  @Roles('SUPER_ADMIN', 'STORE_POS_STAFF')
  createSale(
    @Body() dto: CreatePosSaleDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.pos.createSale(dto, userId);
  }

  @Post('sales/:id/return')
  @Roles('SUPER_ADMIN', 'STORE_POS_STAFF')
  returnSale(
    @Param('id') id: string,
    @Body() body: {
      items: Array<{ posSaleItemId: string; quantity: number }>;
      refundMethod: 'CASH' | 'CARD' | 'MFS_BKASH' | 'MFS_NAGAD' | 'MFS_ROCKET';
      reason?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.returns.returnSale(id, body, userId);
  }

  @Post('sales/:id/exchange')
  @Roles('SUPER_ADMIN', 'STORE_POS_STAFF')
  exchangeSale(
    @Param('id') id: string,
    @Body() body: {
      items: Array<{ posSaleItemId: string; quantity: number }>;
      refundMethod: 'CASH' | 'CARD' | 'MFS_BKASH' | 'MFS_NAGAD' | 'MFS_ROCKET';
      exchangeVariantIds: Array<{ variantId: string; quantity: number }>;
      reason?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.returns.exchangeSale(id, body, userId);
  }

  // -------- BRANCH STOCK --------

  @Get('branches/:branchId/stock')
  @Roles('SUPER_ADMIN', 'STORE_POS_STAFF', 'PURCHASE_MANAGER')
  getBranchStock(
    @Param('branchId') branchId: string,
    @Query('variantId') variantId?: string,
  ) {
    return this.pos.getBranchStock(branchId, variantId);
  }

  // -------- TRANSFERS --------

  @Post('transfers')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER')
  createTransfer(
    @Body() dto: CreateStockTransferDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.pos.createTransfer(dto, userId);
  }

  @Post('transfers/:id/dispatch')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER')
  dispatchTransfer(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pos.dispatchTransfer(id, userId);
  }

  @Post('transfers/:id/receive')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER', 'STORE_POS_STAFF')
  receiveTransfer(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pos.receiveTransfer(id, userId);
  }

  // -------- REPORTS (AC-38) --------

  @Get('reports/daily')
  @Roles('SUPER_ADMIN', 'FINANCE_READONLY', 'FINANCE_MANAGER')
  dailyReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.dailyReport({ from, to });
  }

  @Get('reports/branches')
  @Roles('SUPER_ADMIN', 'FINANCE_READONLY', 'FINANCE_MANAGER')
  branchReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.branchReport({ from, to });
  }

  @Get('reports/daily.csv')
  @Roles('SUPER_ADMIN', 'FINANCE_READONLY', 'FINANCE_MANAGER')
  async dailyReportCsv(
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const csv = await this.reports.dailyReportCsv({ from, to });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="pos-daily.csv"',
    );
    res.send(csv);
  }

  @Get('reports/branches.csv')
  @Roles('SUPER_ADMIN', 'FINANCE_READONLY', 'FINANCE_MANAGER')
  async branchReportCsv(
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const csv = await this.reports.branchReportCsv({ from, to });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="pos-branches.csv"',
    );
    res.send(csv);
  }
}