// apps/api/src/modules/orders/orders.controller.ts
import { Body, Controller, Get, Headers as NestHeaders, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { InvoiceService } from './invoice.service';
import { CourierService } from '../courier/courier.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type {
  AddOrderNoteDto,
  CancelOrderDto,
  OrderListQueryDto,
  UpdateOrderStatusDto,
} from '@ecommarce/types';
import { LookupOrderQueryDto } from './dto/lookup-order.dto';
import type { Response } from 'express';

interface RequestUser {
  userId: string;
  roles: string[];
}

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly invoice: InvoiceService,
    private readonly courier: CourierService,
  ) {}

  @Public()
  @Get('lookup')
  async lookup(@Query() query: LookupOrderQueryDto) {
    const order = await this.orders.findByNumber(query.orderNumber);
    if (!order || order.contactPhone !== query.phone) {
      return { ok: false };
    }
    return { ok: true, order };
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT', 'FINANCE_READONLY')
  @Get()
  list(@Query() query: OrderListQueryDto) {
    return this.orders.list(query);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT', 'FINANCE_READONLY')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orders.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: RequestUser | null,
  ) {
    return this.orders.updateStatus(id, dto, user?.userId ?? null);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT')
  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: RequestUser | null,
  ) {
    return this.orders.cancel(id, dto, user?.userId ?? null);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT')
  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body() dto: AddOrderNoteDto,
    @CurrentUser() user: RequestUser | null,
  ) {
    return this.orders.addNote(id, dto, user?.userId ?? null);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT')
  @Post(':id/dispatch')
  async dispatch(
    @Param('id') id: string,
    @Body() body: { courier?: string; note?: string },
    @NestHeaders('idempotency-key') idemKey: string | undefined,
  ) {
    const provider = (body?.courier ?? 'PATHAO').toUpperCase() as
      | 'PATHAO'
      | 'STEADFAST'
      | 'REDX';
    const key = idemKey ?? `dispatch-${id}-${provider}`;
    const result = await this.courier.createForOrder(id, provider, body?.note, key);
    return { ok: result.ok, provider: result.provider, trackingNumber: result.consignmentId, trackingUrl: result.trackingUrl };
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT', 'FINANCE_READONLY')
  @Get(':id/invoice.pdf')
  async invoicePdf(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.invoice.generatePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.pdf"`);
    res.send(pdf);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT', 'FINANCE_READONLY')
  @Get(':id/invoice.txt')
  async invoiceTxt(@Param('id') id: string, @Res() res: Response) {
    const txt = await this.invoice.generateText(id);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.txt"`);
    res.send(txt);
  }
}