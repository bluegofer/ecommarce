// Courier endpoints (TDD §6.7 + §A.4).
// - GET  /courier/settlements?from&to    (admin)
// - POST /courier/sync/:shipmentId       (admin — manual pull)
// - POST /courier/webhook/:provider      (public — signature verified inside)
//
// Consignment creation is exposed as POST /orders/:id/dispatch (see orders.controller).
import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Param, Post, Query, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CourierService } from './courier.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CourierProvider } from '@ecommarce/types';

const ALLOWED: CourierProvider[] = ['PATHAO', 'STEADFAST', 'REDX'];

@ApiTags('courier')
@Controller('courier')
export class CourierController {
  constructor(private readonly courier: CourierService) {}

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT', 'FINANCE_READONLY')
  @Get('settlements')
  async settlements(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const now = new Date();
    const periodEnd = to ?? now.toISOString();
    const periodStart = from ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const rows = await this.courier.listSettlements(periodStart, periodEnd);
    return rows;
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT')
  @Post('sync/:shipmentId')
  @HttpCode(200)
  async sync(@Param('shipmentId') shipmentId: string) {
    return this.courier.syncTracking(shipmentId);
  }

  @Public()
  @Post('webhook/:provider')
  @HttpCode(200)
  async webhook(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature: string | undefined,
  ) {
    const upper = provider.toUpperCase() as CourierProvider;
    if (!ALLOWED.includes(upper)) {
      throw new BadRequestException(`unsupported provider: ${provider}`);
    }
    const rawBody =
      req.rawBody?.toString('utf8') ??
      (typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}));
    const result = await this.courier.handleWebhook(upper, rawBody, signature);
    return result;
  }

  // ── Step-84 (D-2): admin settlement management ──
  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT', 'FINANCE_READONLY')
  @Get('active-shipments')
  async activeShipments() {
    return this.courier.activeShipments();
  }


  @Roles('SUPER_ADMIN', 'FINANCE_READONLY', 'FINANCE_MANAGER', 'ORDER_SUPPORT')
  @Get('settlements/unreconciled')
  async unreconciled() {
    return this.courier.listUnreconciled();
  }

  @Roles('SUPER_ADMIN', 'FINANCE_READONLY', 'FINANCE_MANAGER', 'ORDER_SUPPORT')
  @Get('settlements/all')
  async allSettlements() {
    return this.courier.listAllSettlements();
  }

  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER')
  @Post('settlements/:id/mark-reconciled')
  @HttpCode(200)
  async markReconciled(
    @Param('id') id: string,
    @Body() body: { receivedPoisha: number; notes?: string | null },
    @Req() req: Request,
  ) {
    // userId from JWT (attached by AuthGuard)
    const userId = (req as unknown as { user?: { sub?: string } }).user?.sub ?? 'system';
    return this.courier.markReconciled(id, body.receivedPoisha, body.notes, userId);
  }}
