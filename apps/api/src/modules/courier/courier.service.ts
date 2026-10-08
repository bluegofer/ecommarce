// CourierService — one entry point for consignment creation, tracking sync,
// settlement fetch, and webhook handling. TDD §6.7 + §A.4.
//
// Never silently overrides a staff-set Shipment status: if the shipment is
// already moved forward by a human (DELIVERED/RETURNED), tracking events are
// recorded in Shipment.meta only (TDD §A.4 ground rule).
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { COURIER_ADAPTERS } from './courier-adapter.interface';
import type { CourierAdapterRegistry } from './courier-adapter.interface';
import type {
  ConsignmentInput,
  ConsignmentResult,
  CourierProvider,
  CourierTrackingEvent,
  SettlementRecord,
  ShipmentStatus,
} from '@ecommarce/types';

export interface SettlementListRow {
  id: string;
  courier: string;
  period: string;
  codCollectedPoisha: number;
  payoutPoisha: number;
  status: 'PENDING' | 'MATCHED' | 'DISCREPANCY';
}

const TERMINAL_SHIPMENT: ShipmentStatus[] = ['DELIVERED', 'RETURNED'];

@Injectable()
export class CourierService {
  private readonly logger = new Logger(CourierService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(COURIER_ADAPTERS) private readonly adapters: CourierAdapterRegistry,
  ) {}

  /**
   * Creates (or reuses) a consignment for an order. Called by the admin
   * dispatch action (POST /orders/:id/dispatch). Writes tracking number
   * back to Shipment and stores raw meta.
   */
  async createForOrder(
    orderId: string,
    provider: CourierProvider,
    merchantNote: string | undefined,
    idempotencyKey: string,
  ): Promise<ConsignmentResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        shipments: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) throw new NotFoundException('order not found');

    const existing = order.shipments.find(
      (s) => s.courier === provider && s.trackingNumber && !TERMINAL_SHIPMENT.includes(s.status),
    );
    if (existing && existing.trackingNumber) {
      this.logger.log(`Reusing existing ${provider} consignment for ${order.orderNumber}`);

    // step-170: auto-transition order to SHIPPED after successful dispatch.
    // This removes the order from the PROCESSING dispatch queue and
    // reflects the real courier action. Manual delivery status (IN_TRANSIT,
    // DELIVERED) remains a separate, staff-driven action per TDD A.4.
    if (order.status === 'PROCESSING') {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'SHIPPED', shippedAt: new Date() },
      });
      await this.prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: 'PROCESSING',
          toStatus: 'SHIPPED',
          actorUserId: null,
          note: 'Auto-transitioned after courier dispatch',
        },
      });
    }
      return {
        ok: true,
        provider,
        consignmentId: existing.trackingNumber,
        trackingUrl: undefined,
        rawResponse: { reused: true },
      };
    }

    const adapter = this.adapters.get(provider);
    const itemCount = order.items.reduce((sum, it) => sum + it.quantity, 0);

    // Address comes from shippingAddressJson (Order model stores it as Json).
    const ship =
      order.shippingAddressJson && typeof order.shippingAddressJson === 'object'
        ? (order.shippingAddressJson as Record<string, unknown>)
        : {};

    // Payment method from the most recent Payment row (Order has no scalar).
    const latestPayment = order.payments[0];
    const isCod = (latestPayment?.method ?? 'COD') === 'COD';

    const input: ConsignmentInput = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      recipientName: typeof ship['recipientName'] === 'string' ? (ship['recipientName'] as string) : 'Customer',
      recipientPhone: order.contactPhone,
      recipientAddress: typeof ship['line1'] === 'string' ? (ship['line1'] as string) : '',
      recipientCity: typeof ship['city'] === 'string' ? (ship['city'] as string) : '',
      recipientZone: typeof ship['area'] === 'string' ? (ship['area'] as string) : '',
      codAmountPoisha: isCod ? order.totalPoisha : 0,
      weightGrams: 500 * itemCount,
      itemCount,
      merchantNote,
      idempotencyKey,
    };

    const result = await adapter.createConsignment(input);

    await this.prisma.shipment.create({
      data: {
        orderId: order.id,
        courier: provider,
        trackingNumber: result.consignmentId ?? null,
        status: 'PENDING',
        meta: (result.rawResponse ?? {}) as object,
      },
    });

    // step-170: auto-transition order to SHIPPED after successful dispatch.
    // This removes the order from the PROCESSING dispatch queue and
    // reflects the real courier action. Manual delivery status (IN_TRANSIT,
    // DELIVERED) remains a separate, staff-driven action per TDD A.4.
    if (order.status === 'PROCESSING') {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'SHIPPED', shippedAt: new Date() },
      });
      await this.prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: 'PROCESSING',
          toStatus: 'SHIPPED',
          actorUserId: null,
          note: 'Auto-transitioned after courier dispatch',
        },
      });
    }

    // step-167: upsert monthly CourierSettlement so DB is single source of truth.
    // Every dispatch increments expected COD + order count for that courier/month.
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
    const existingSettlement = await this.prisma.courierSettlement.findFirst({
      where: { courierCode: provider, periodStart },
    });
    if (existingSettlement) {
      await this.prisma.courierSettlement.update({
        where: { id: existingSettlement.id },
        data: {
          expectedPoisha: existingSettlement.expectedPoisha + order.totalPoisha,
          orderCount: existingSettlement.orderCount + 1,
        },
      });
    } else {
      await this.prisma.courierSettlement.create({
        data: {
          courierCode: provider,
          periodStart,
          periodEnd,
          expectedPoisha: order.totalPoisha,
          receivedPoisha: 0,
          orderCount: 1,
          status: 'PENDING',
        },
      });
    }

    return result;
  }

  /**
   * Pulls tracking from the courier adapter and applies new events. Idempotent
   * per eventId. A shipment already moved to a terminal status by staff
   * (DELIVERED/RETURNED) will not be downgraded — the event is stored in meta
   * only and a review flag is set (TDD §A.4).
   */
  async syncTracking(shipmentId: string): Promise<{ ok: boolean; applied: number; flagged: number }> {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) throw new NotFoundException('shipment not found');
    if (!shipment.trackingNumber) throw new BadRequestException('shipment has no trackingNumber');

    const provider = shipment.courier as CourierProvider;
    const adapter = this.adapters.get(provider);
    const result = await adapter.syncTracking({
      provider,
      consignmentId: shipment.trackingNumber,
      since: undefined,
    });

    let applied = 0;
    let flagged = 0;
    const meta = (shipment.meta && typeof shipment.meta === 'object' ? shipment.meta : {}) as Record<string, unknown>;
    const seen = new Set<string>(
      Array.isArray(meta['appliedEventIds']) ? (meta['appliedEventIds'] as string[]) : [],
    );

    for (const ev of result.events) {
      if (seen.has(ev.eventId)) continue;
      seen.add(ev.eventId);

      const canOverride = !TERMINAL_SHIPMENT.includes(shipment.status);
      if (!canOverride && ev.status !== shipment.status) {
        flagged += 1;
        this.logger.warn(
          `Conflict: shipment ${shipmentId} staff-set ${shipment.status} vs courier ${ev.status} (${ev.eventId})`,
        );
        continue;
      }

      const patch: Record<string, unknown> = { meta: { ...meta, lastEvent: ev } };
      if (ev.status !== shipment.status) {
        patch.status = ev.status;
        if (ev.status === 'DELIVERED') patch.deliveredAt = new Date(ev.occurredAt);
        if (ev.status === 'IN_TRANSIT' && !shipment.dispatchedAt) patch.dispatchedAt = new Date(ev.occurredAt);
      }
      meta['lastEvent'] = ev;
      patch.meta = meta;

      await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: patch,
      });
      applied += 1;
    }

    meta['appliedEventIds'] = Array.from(seen);
    await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { meta: meta as object },
    });

    return { ok: result.ok, applied, flagged };
  }

  /**
   * Aggregates Shipment.meta records into admin-friendly settlement rows.
   * Pathao pushes settlement rows via fetchSettlements(period).
   */
  async listSettlements(periodStart: string, periodEnd: string): Promise<SettlementListRow[]> {
    const rows: SettlementListRow[] = [];
    const providers = this.adapters.all();
    for (const adapter of providers) {
      try {
        const records: SettlementRecord[] = await adapter.fetchSettlements(periodStart, periodEnd);
        for (const r of records) {
          rows.push({
            id: r.settlementId,
            courier: r.provider,
            period: `${r.periodStart.slice(0, 10)} → ${r.periodEnd.slice(0, 10)}`,
            codCollectedPoisha: r.totalCollectedPoisha,
            payoutPoisha: r.netPayablePoisha,
            status: r.receivedAt ? 'MATCHED' : 'PENDING',
          });
        }
      } catch (err) {
        this.logger.warn(`Settlement fetch failed for ${adapter.provider}: ${(err as Error).message}`);
      }
    }
    return rows;
  }

  /**
   * Applies a courier tracking webhook. Idempotent on eventId; respects
   * manual overrides (see syncTracking).
   */
  async handleWebhook(
    provider: CourierProvider,
    rawBody: string,
    signature: string | undefined,
  ): Promise<{ ok: boolean; reason?: string }> {
    const adapter = this.adapters.get(provider);
    const event: CourierTrackingEvent | null = await adapter.verifyWebhook(rawBody, signature);
    if (!event) return { ok: false, reason: 'invalid webhook' };

    const shipment = await this.prisma.shipment.findFirst({
      where: { courier: provider, trackingNumber: event.consignmentId },
    });
    if (!shipment) return { ok: false, reason: 'shipment not found for consignment' };

    return this.syncTracking(shipment.id).then(() => ({ ok: true }));
  }

  // ── Step-84 (D-2): unreconciled courier settlements ──

  async listUnreconciled(): Promise<
    Array<{
      id: string;
      courierCode: string;
      periodStart: Date;
      periodEnd: Date;
      expectedPoisha: number;
      receivedPoisha: number;
      orderCount: number;
      status: string;
      notes: string | null;
      createdAt: Date;
    }>
  > {
    return this.prisma.courierSettlement.findMany({
      where: { status: { in: ['PENDING', 'PARTIAL', 'DISCREPANCY'] } },
      orderBy: { periodStart: 'desc' },
    });
  }

  async listAllSettlements(): Promise<
    Array<{
      id: string;
      courierCode: string;
      periodStart: Date;
      periodEnd: Date;
      expectedPoisha: number;
      receivedPoisha: number;
      orderCount: number;
      status: string;
      reconciledAt: Date | null;
      notes: string | null;
    }>
  > {
    return this.prisma.courierSettlement.findMany({
      orderBy: { periodStart: 'desc' },
      take: 200,
    });
  }

  async markReconciled(
    id: string,
    receivedPoisha: number,
    notes: string | null | undefined,
    byUserId: string,
  ) {
    const existing = await this.prisma.courierSettlement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('settlement not found');
    if (receivedPoisha < 0) throw new BadRequestException('receivedPoisha must be >= 0');

    const status =
      receivedPoisha >= existing.expectedPoisha
        ? 'RECONCILED'
        : receivedPoisha > 0
          ? 'PARTIAL'
          : 'PENDING';

    return this.prisma.courierSettlement.update({
      where: { id },
      data: {
        receivedPoisha,
        status,
        notes: notes === undefined ? existing.notes : notes,
        reconciledAt: status === 'RECONCILED' ? new Date() : existing.reconciledAt,
        reconciledBy: status === 'RECONCILED' ? byUserId : existing.reconciledBy,
      },
    });
  }

  /**
   * step-172: active shipments list — dashboard view of in-transit orders.
   * ShipmentStatus enum: PENDING | DISPATCHED | IN_TRANSIT | DELIVERED | RETURNED
   */
  async activeShipments(): Promise<
    Array<{
      shipmentId: string;
      orderId: string;
      orderNumber: string;
      customerName: string | null;
      customerPhone: string | null;
      city: string | null;
      courier: string;
      trackingNumber: string | null;
      shipmentStatus: string;
      orderStatus: string;
      shippedAt: Date | null;
      deliveredAt: Date | null;
      updatedAt: Date;
      createdAt: Date;
    }>
  > {
    const rows = await this.prisma.shipment.findMany({
      where: {
        status: { in: ['DISPATCHED', 'IN_TRANSIT'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        order: {
          include: {
            customer: { select: { fullName: true } },
          },
        },
      },
    });

    return rows.map((r) => {
      const ship = r.order.shippingAddressJson as Record<string, unknown> | null;
      const recipientFromShip =
        ship && typeof ship.recipientName === 'string'
          ? (ship.recipientName as string)
          : null;
      const city =
        ship && typeof ship.city === 'string' ? (ship.city as string) : null;
      return {
        shipmentId: r.id,
        orderId: r.order.id,
        orderNumber: r.order.orderNumber,
        customerName: r.order.customer?.fullName ?? recipientFromShip,
        customerPhone: r.order.contactPhone,
        city,
        courier: r.courier,
        trackingNumber: r.trackingNumber,
        shipmentStatus: r.status,
        orderStatus: r.order.status,
        shippedAt: r.dispatchedAt,
        deliveredAt: r.deliveredAt,
        updatedAt: r.updatedAt,
        createdAt: r.createdAt,
      };
    });
  }
}
