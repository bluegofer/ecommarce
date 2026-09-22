// apps/api/src/modules/orders/orders.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { assertTransition } from './order-state-machine';
import { DispatchService } from '../notifications/dispatch.service';
import { LedgerService } from '../accounting/services/ledger.service';
import type {
  AddOrderNoteDto,
  CancelOrderDto,
  OrderDto,
  OrderStatus,
  PaginatedOrdersDto,
  PaymentMethod,
  PaymentStatus,
  ShipmentStatus,
  UpdateOrderStatusDto,
} from '@ecommarce/types';
import type { Prisma } from '@prisma/client';
import { ListOrdersQueryDto } from './dto/list-orders.dto';

const NOTIFICATION_FOR_STATUS: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'order.confirmed',
  PROCESSING: 'order.processing',
  SHIPPED: 'order.shipped',
  DELIVERED: 'order.delivered',
  CANCELLED: 'order.cancelled',
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: DispatchService,
    private readonly ledger: LedgerService,
  ) {}

  // -------------------------------------------------------------------------
  // Create (internal, called from CheckoutService inside its own transaction)
  // -------------------------------------------------------------------------

  async generateOrderNumber(): Promise<string> {
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const seq = (await this.prisma.order.count()).toString().padStart(5, '0');
    return `SKY-${ymd}-${seq}-${rand}`;
  }

  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------

  async findOne(id: string): Promise<OrderDto> {
    const row = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        notes: { orderBy: { createdAt: 'asc' } },
        payments: { orderBy: { createdAt: 'desc' } },
        shipments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!row) throw new NotFoundException('order not found');
    return this.toDto(row);
  }

  async findByNumber(orderNumber: string): Promise<OrderDto | null> {
    // Defense-in-depth guard for BLUEGOFER-API-1 (Step 15.8).
    // Missing/empty orderNumber must never reach Prisma findUnique --
    // it would throw a PrismaClientValidationError mapped to HTTP 500.
    // The controller-level LookupOrderQueryDto already rejects this case
    // with HTTP 400; this guard protects any internal caller too.
    if (
      !orderNumber ||
      typeof orderNumber !== 'string' ||
      orderNumber.trim() === ''
    ) {
      return null;
    }
    const row = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        notes: { orderBy: { createdAt: 'asc' } },
        payments: { orderBy: { createdAt: 'desc' } },
        shipments: { orderBy: { createdAt: 'desc' } },
      },
    });
    return row ? this.toDto(row) : null;
  }

  async list(query: ListOrdersQueryDto): Promise<PaginatedOrdersDto> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(96, Math.max(1, query.pageSize ?? 24));
    const skip = (page - 1) * pageSize;

    const where: Prisma.OrderWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;
    if (query.phone) where.contactPhone = query.phone;
    if (query.q) {
      where.OR = [
        { orderNumber: { contains: query.q, mode: 'insensitive' } },
        { contactPhone: { contains: query.q } },
      ];
    }
    if (query.fromDate || query.toDate) {
      const range: Prisma.DateTimeFilter = {};
      if (query.fromDate) range.gte = new Date(query.fromDate);
      if (query.toDate) range.lte = new Date(query.toDate);
      where.placedAt = range;
    }

    const [total, rows] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { placedAt: 'desc' },
        skip,
        take: pageSize,
        include: { items: true },
      }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        orderNumber: r.orderNumber,
        status: r.status as OrderStatus,
        totalPoisha: r.totalPoisha,
        placedAt: r.placedAt.toISOString(),
        itemCount: r.items.reduce((s, i) => s + i.quantity, 0),
        contactPhone: r.contactPhone,
        shippingCity: String(
          (r.shippingAddressJson as Record<string, unknown>).city ?? '',
        ),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // -------------------------------------------------------------------------
  // State transitions (transactional)
  // -------------------------------------------------------------------------

  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    actorUserId: string | null,
  ): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true },
    });
    if (!order) throw new NotFoundException('order not found');

    const from = order.status as OrderStatus;
    const to = dto.status;
    assertTransition(from, to);

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // 1. Transition + timestamps
      const data: Prisma.OrderUpdateInput = { status: to };
      if (to === 'CONFIRMED') data.confirmedAt = now;
      if (to === 'PROCESSING') data.processingAt = now;
      if (to === 'SHIPPED') data.shippedAt = now;
      if (to === 'DELIVERED') data.deliveredAt = now;
      if (to === 'CANCELLED') data.cancelledAt = now;

      await tx.order.update({ where: { id: orderId }, data });

      // 2. Side effect: restock on CANCELLED (from non-final states)
      if (to === 'CANCELLED') {
        for (const item of order.items) {
          await tx.$executeRaw`
            UPDATE variants
            SET stock = stock + ${item.quantity}, "updatedAt" = NOW()
            WHERE id = ${item.variantId}
          `;
        }
      }

      // 2.5 A.5 chain: post revenue on DELIVERED (Website Orders -> Accounting)
      if (to === 'DELIVERED') {
        await this.postRevenueOnDelivery(tx, order);
      }

      // 3. Status history row
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: from,
          toStatus: to,
          actorUserId,
          note: dto.note ?? null,
        },
      });
    });

    // 4. Enqueue notification (outside transaction — outbox pattern in Step 12)
    const tplKey = NOTIFICATION_FOR_STATUS[to];
    if (tplKey) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: order.customerId },
      });
      if (customer) {
        void this.notifications
          .dispatch({
            templateKey: tplKey,
            channel: 'SMS',
            recipient: order.contactPhone,
            customerId: customer.id,
            orderId,
            variables: {
              orderNumber: order.orderNumber,
              status: to,
              total: (order.totalPoisha / 100).toFixed(2),
            },
          })
          .catch(() => undefined);
      }
    }

    return this.findOne(orderId);
  }

  async cancel(
    orderId: string,
    dto: CancelOrderDto,
    actorUserId: string | null,
  ): Promise<OrderDto> {
    return this.updateStatus(
      orderId,
      { status: 'CANCELLED', note: dto.reason },
      actorUserId,
    );
  }

  // -------------------------------------------------------------------------
  // Notes
  // -------------------------------------------------------------------------

  async addNote(
    orderId: string,
    dto: AddOrderNoteDto,
    actorUserId: string | null,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('order not found');
    if (!dto.body || dto.body.trim().length === 0) {
      throw new BadRequestException('note body required');
    }
    await this.prisma.orderNote.create({
      data: {
        orderId,
        body: dto.body.trim(),
        isCustomerVisible: dto.isCustomerVisible ?? false,
        actorUserId,
      },
    });
    return this.findOne(orderId);
  }

  // -------------------------------------------------------------------------
  // Payment status update (stub — real adapters in Step 10)
  // -------------------------------------------------------------------------

  async markPaymentPaid(paymentId: string, gatewayRef: string): Promise<void> {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'PAID', paidAt: new Date(), gatewayRef },
    });
  }

  // -------------------------------------------------------------------------
  // DTO mapping
  // -------------------------------------------------------------------------

  private toDto(row: {
    id: string;
    orderNumber: string;
    customerId: string;
    status: string;
    subtotalPoisha: number;
    discountPoisha: number;
    deliveryChargePoisha: number;
    totalPoisha: number;
    couponCode: string | null;
    shippingAddressJson: unknown;
    contactPhone: string;
    contactEmail: string | null;
    customerNote: string | null;
    cancelReason: string | null;
    placedAt: Date;
    confirmedAt: Date | null;
    processingAt: Date | null;
    shippedAt: Date | null;
    deliveredAt: Date | null;
    cancelledAt: Date | null;
    items: Array<{
      id: string;
      orderId: string;
      variantId: string;
      productTitleEn: string;
      productTitleBn: string;
      variantSnapshot: unknown;
      quantity: number;
      unitPricePoisha: number;
      lineTotalPoisha: number;
    }>;
    statusHistory: Array<{
      id: string;
      orderId: string;
      fromStatus: string | null;
      toStatus: string;
      actorUserId: string | null;
      note: string | null;
      createdAt: Date;
    }>;
    notes: Array<{
      id: string;
      orderId: string;
      body: string;
      isCustomerVisible: boolean;
      actorUserId: string | null;
      createdAt: Date;
    }>;
    payments: Array<{
      id: string;
      orderId: string;
      method: string;
      status: string;
      amountPoisha: number;
      gatewayRef: string | null;
      paidAt: Date | null;
      refundedPoisha: number;
      createdAt: Date;
    }>;
    shipments: Array<{
      id: string;
      orderId: string;
      courier: string;
      trackingNumber: string | null;
      status: string;
      dispatchedAt: Date | null;
      deliveredAt: Date | null;
      createdAt: Date;
    }>;
  }): OrderDto {
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      customerId: row.customerId,
      status: row.status as OrderStatus,
      subtotalPoisha: row.subtotalPoisha,
      discountPoisha: row.discountPoisha,
      deliveryChargePoisha: row.deliveryChargePoisha,
      totalPoisha: row.totalPoisha,
      couponCode: row.couponCode,
      shippingAddressJson: row.shippingAddressJson as Record<string, unknown>,
      contactPhone: row.contactPhone,
      contactEmail: row.contactEmail,
      customerNote: row.customerNote,
      cancelReason: row.cancelReason,
      placedAt: row.placedAt.toISOString(),
      confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null,
      processingAt: row.processingAt ? row.processingAt.toISOString() : null,
      shippedAt: row.shippedAt ? row.shippedAt.toISOString() : null,
      deliveredAt: row.deliveredAt ? row.deliveredAt.toISOString() : null,
      cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
      items: row.items.map((i) => ({
        id: i.id,
        orderId: i.orderId,
        variantId: i.variantId,
        productTitleEn: i.productTitleEn,
        productTitleBn: i.productTitleBn,
        variantSnapshot: (i.variantSnapshot as Record<string, unknown>) ?? {},
        quantity: i.quantity,
        unitPricePoisha: i.unitPricePoisha,
        lineTotalPoisha: i.lineTotalPoisha,
      })),
      statusHistory: row.statusHistory.map((h) => ({
        id: h.id,
        orderId: h.orderId,
        fromStatus: h.fromStatus as OrderStatus | null,
        toStatus: h.toStatus as OrderStatus,
        actorUserId: h.actorUserId,
        note: h.note,
        createdAt: h.createdAt.toISOString(),
      })),
      notes: row.notes.map((n) => ({
        id: n.id,
        orderId: n.orderId,
        body: n.body,
        isCustomerVisible: n.isCustomerVisible,
        actorUserId: n.actorUserId,
        createdAt: n.createdAt.toISOString(),
      })),
      payments: row.payments.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        method: p.method as PaymentMethod,
        status: p.status as PaymentStatus,
        amountPoisha: p.amountPoisha,
        gatewayRef: p.gatewayRef,
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        refundedPoisha: p.refundedPoisha,
        createdAt: p.createdAt.toISOString(),
      })),
      shipments: row.shipments.map((s) => ({
        id: s.id,
        orderId: s.orderId,
        courier: s.courier,
        trackingNumber: s.trackingNumber,
        status: s.status as ShipmentStatus,
        dispatchedAt: s.dispatchedAt ? s.dispatchedAt.toISOString() : null,
        deliveredAt: s.deliveredAt ? s.deliveredAt.toISOString() : null,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }

  // -------------------------------------------------------------------------
  // A.5 chain: Website Orders -> Accounting (revenue posting on delivery)
  // -------------------------------------------------------------------------
  private async postRevenueOnDelivery(
    tx: Prisma.TransactionClient,
    order: {
      id: string;
      orderNumber: string;
      totalPoisha: number;
      payments: Array<{ status: string; method: string }>;
    },
  ): Promise<void> {
    // Idempotency: one ORDER-sourced journal per order
    const existing = await tx.journalEntry.findFirst({
      where: { sourceType: 'ORDER', sourceId: order.id },
    });
    if (existing) return;

    const paidPayment = order.payments.find((p) => p.status === 'PAID');
    if (!paidPayment) return;

    const method = paidPayment.method;
    const debitCode =
      method === 'COD'
        ? '1000-CASH'
        : method === 'BKASH' || method === 'NAGAD'
          ? '1020-MFS'
          : '1010-BANK';

    const debit = await tx.ledgerAccount.findUnique({
      where: { code: debitCode },
    });
    const sales = await tx.ledgerAccount.findUnique({
      where: { code: '4000-SALES' },
    });
    if (!debit || !sales) {
      throw new BadRequestException('Ledger accounts missing for revenue posting');
    }

    await this.ledger.postEntry(
      {
        entryDate: new Date().toISOString(),
        description: 'Order ' + order.orderNumber + ' delivered - revenue',
        sourceType: 'ORDER',
        sourceId: order.id,
        lines: [
          {
            ledgerAccountId: debit.id,
            debit: order.totalPoisha,
            credit: 0,
            description: 'Payment in',
          },
          {
            ledgerAccountId: sales.id,
            debit: 0,
            credit: order.totalPoisha,
            description: 'Sales revenue',
          },
        ],
      },
      { tx, status: 'POSTED' },
    );
  }
}