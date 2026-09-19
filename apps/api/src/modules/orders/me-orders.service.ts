// apps/api/src/modules/orders/me-orders.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface MyOrderListItemDto {
  id: string;
  orderNumber: string;
  status: string;
  totalPoisha: number;
  subtotalPoisha: number;
  discountPoisha: number;
  deliveryChargePoisha: number;
  placedAt: string;
  itemCount: number;
  firstItem: { title: string; imageUrl: string | null } | null;
}

export interface MyOrderDetailDto extends MyOrderListItemDto {
  shippingAddressJson: unknown;
  contactPhone: string;
  contactEmail: string | null;
  customerNote: string | null;
  cancelReason: string | null;
  trackingNumber: string | null;
  courierName: string | null;
  items: Array<{
    id: string;
    variantId: string;
    titleEn: string;
    titleBn: string;
    variantSnapshot: unknown;
    unitPricePoisha: number;
    quantity: number;
    lineTotalPoisha: number;
    imageUrl: string | null;
  }>;
  statusHistory: Array<{
    fromStatus: string | null;
    toStatus: string;
    createdAt: string;
    note: string | null;
  }>;
}

@Injectable()
export class MeOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve Customer via userId — no auto-create here (orders imply customer exists). */
  private async customerIdOrNull(userId: string): Promise<string | null> {
    const c = await this.prisma.customer.findUnique({ where: { userId } });
    return c?.id ?? null;
  }

  /** Look up one image per variantId from ProductMedia (variant images preferred). */
  private async variantImageMap(variantIds: string[]): Promise<Map<string, string>> {
    if (variantIds.length === 0) return new Map();
    const media = await this.prisma.productMedia.findMany({
      where: { variantId: { in: variantIds } },
      orderBy: { sortOrder: 'asc' },
    });
    const map = new Map<string, string>();
    for (const m of media) {
      if (m.variantId && !map.has(m.variantId)) {
        map.set(m.variantId, m.url);
      }
    }
    return map;
  }

  async list(userId: string): Promise<MyOrderListItemDto[]> {
    const customerId = await this.customerIdOrNull(userId);
    if (!customerId) return [];

    const orders = await this.prisma.order.findMany({
      where: { customerId },
      orderBy: { placedAt: 'desc' },
      take: 100,
      include: {
        items: true,
        _count: { select: { items: true } },
      },
    });

    // Batch-fetch one image per first-item variant
    const firstVariantIds = orders
      .map((o) => o.items[0]?.variantId)
      .filter((v): v is string => Boolean(v));
    const imageMap = await this.variantImageMap(firstVariantIds);

    return orders.map((o) => {
      const first = o.items[0];
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalPoisha: o.totalPoisha,
        subtotalPoisha: o.subtotalPoisha,
        discountPoisha: o.discountPoisha,
        deliveryChargePoisha: o.deliveryChargePoisha,
        placedAt: o.placedAt.toISOString(),
        itemCount: o._count.items,
        firstItem: first
          ? {
              title: first.productTitleEn,
              imageUrl: imageMap.get(first.variantId) ?? null,
            }
          : null,
      };
    });
  }

  async findOne(userId: string, orderId: string): Promise<MyOrderDetailDto> {
    const customerId = await this.customerIdOrNull(userId);
    if (!customerId) throw new NotFoundException('order not found');

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        shipments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!order) throw new NotFoundException('order not found');

    const variantIds = order.items.map((it) => it.variantId);
    const imageMap = await this.variantImageMap(variantIds);

    const latestShipment = order.shipments[0];
    const first = order.items[0];

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalPoisha: order.totalPoisha,
      subtotalPoisha: order.subtotalPoisha,
      discountPoisha: order.discountPoisha,
      deliveryChargePoisha: order.deliveryChargePoisha,
      placedAt: order.placedAt.toISOString(),
      itemCount: order.items.length,
      firstItem: first
        ? {
            title: first.productTitleEn,
            imageUrl: imageMap.get(first.variantId) ?? null,
          }
        : null,
      shippingAddressJson: order.shippingAddressJson,
      contactPhone: order.contactPhone,
      contactEmail: order.contactEmail,
      customerNote: order.customerNote,
      cancelReason: order.cancelReason,
      trackingNumber: latestShipment?.trackingNumber ?? null,
      courierName: latestShipment?.courier ?? null,
      items: order.items.map((it) => ({
        id: it.id,
        variantId: it.variantId,
        titleEn: it.productTitleEn,
        titleBn: it.productTitleBn,
        variantSnapshot: it.variantSnapshot,
        unitPricePoisha: it.unitPricePoisha,
        quantity: it.quantity,
        lineTotalPoisha: it.lineTotalPoisha,
        imageUrl: imageMap.get(it.variantId) ?? null,
      })),
      statusHistory: order.statusHistory.map((h) => ({
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        createdAt: h.createdAt.toISOString(),
        note: h.note,
      })),
    };
  }
}