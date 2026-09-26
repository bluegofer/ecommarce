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
}