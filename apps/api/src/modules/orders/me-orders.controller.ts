// apps/api/src/modules/orders/me-orders.controller.ts
import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { MeOrdersService } from './me-orders.service';
import { InvoiceService } from './invoice.service';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('me-orders')
@Controller('me/orders')
export class MeOrdersController {
  constructor(
    private readonly meOrders: MeOrdersService,
    private readonly invoice: InvoiceService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.meOrders.list(user.userId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.meOrders.findOne(user.userId, id);
  }

  /**
   * Customer-facing invoice download (T2-4).
   * Ownership enforced by meOrders.findOne(userId, id) — throws 404
   * if the order does not belong to the caller. TDD §6.6 + §10.1.
   */
  @Get(':id/invoice.pdf')
  async invoicePdf(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    // Ownership check (throws NotFoundException on mismatch)
    await this.meOrders.findOne(user.userId, id);
    const pdf = await this.invoice.generatePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${id}.pdf"`,
    );
    res.send(pdf);
  }
}