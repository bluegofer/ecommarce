// apps/api/src/modules/purchase/purchase.controller.ts
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequisitionsService } from './requisitions.service';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseInvoicesService } from './purchase-invoices.service';
import { GRNService } from './grn.service';
import type {
  CreateRequisitionInput,
  CreatePurchaseOrderInput,
  CreatePurchaseInvoiceInput,
  CreateGRNInput,
} from '@ecommarce/types';
import type { ReqStatus, PoStatus } from './purchase-order-state-machine';

@Controller('purchase')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseController {
  constructor(
    private readonly req: RequisitionsService,
    private readonly po: PurchaseOrdersService,
    private readonly inv: PurchaseInvoicesService,
    private readonly grn: GRNService,
  ) {}

  // ---- Requisitions ----
  @Get('requisitions')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER', 'FINANCE_READONLY')
  listReq(@Query() q: any) {
    return this.req.list({
      status: q.status, branchId: q.branchId,
      limit: q.limit ? parseInt(q.limit, 10) : undefined,
      offset: q.offset ? parseInt(q.offset, 10) : undefined,
    });
  }

  @Get('requisitions/:id')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER', 'FINANCE_READONLY')
  getReq(@Param('id') id: string) { return this.req.findById(id); }

  @Post('requisitions')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER')
  createReq(@Body() body: CreateRequisitionInput, @CurrentUser() user: any) {
    return this.req.create(body, user?.id);
  }

  @Patch('requisitions/:id/transition')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER')
  transitionReq(@Param('id') id: string, @Body() body: { to: ReqStatus }, @CurrentUser() user: any) {
    return this.req.transition(id, body.to, user?.id);
  }

  // ---- Purchase Orders ----
  @Get('orders')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER', 'FINANCE_READONLY')
  listPo(@Query() q: any) {
    return this.po.list({
      status: q.status, supplierId: q.supplierId, branchId: q.branchId,
      limit: q.limit ? parseInt(q.limit, 10) : undefined,
      offset: q.offset ? parseInt(q.offset, 10) : undefined,
    });
  }

  @Get('orders/:id')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER', 'FINANCE_READONLY')
  getPo(@Param('id') id: string) { return this.po.findById(id); }

  @Post('orders')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER')
  createPo(@Body() body: CreatePurchaseOrderInput, @CurrentUser() user: any) {
    return this.po.create(body, user?.id);
  }

  @Patch('orders/:id/transition')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER')
  transitionPo(@Param('id') id: string, @Body() body: { to: PoStatus }) {
    return this.po.transition(id, body.to);
  }

  // ---- Purchase Invoices ----
  @Get('invoices')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  listInv(@Query() q: any) {
    return this.inv.list({
      status: q.status, supplierId: q.supplierId,
      limit: q.limit ? parseInt(q.limit, 10) : undefined,
      offset: q.offset ? parseInt(q.offset, 10) : undefined,
    });
  }

  @Get('invoices/:id')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  getInv(@Param('id') id: string) { return this.inv.findById(id); }

  @Post('invoices')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER', 'FINANCE_MANAGER')
  createInv(@Body() body: CreatePurchaseInvoiceInput) { return this.inv.create(body); }

  @Post('invoices/:id/post')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER', 'FINANCE_MANAGER')
  postInv(@Param('id') id: string) { return this.inv.post(id); }

  @Post('invoices/:id/void')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER')
  voidInv(@Param('id') id: string) { return this.inv.void(id); }

  // ---- GRN (the A.5 chain) ----
  @Get('grns')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER', 'FINANCE_READONLY')
  listGrn(@Query() q: any) {
    return this.grn.list({
      status: q.status, poId: q.poId, branchId: q.branchId,
      limit: q.limit ? parseInt(q.limit, 10) : undefined,
      offset: q.offset ? parseInt(q.offset, 10) : undefined,
    });
  }

  @Get('grns/:id')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER', 'FINANCE_READONLY')
  getGrn(@Param('id') id: string) { return this.grn.findById(id); }

  @Post('grns')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER')
  createGrn(@Body() body: CreateGRNInput, @CurrentUser() user: any) {
    return this.grn.create(body, user?.id);
  }

  @Post('grns/:id/confirm')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER')
  confirmGrn(@Param('id') id: string) { return this.grn.confirm(id); }

  @Post('grns/:id/cancel')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER')
  cancelGrn(@Param('id') id: string) { return this.grn.cancel(id); }
}