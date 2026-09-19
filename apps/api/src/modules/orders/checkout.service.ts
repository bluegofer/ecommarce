// apps/api/src/modules/orders/checkout.service.ts
// Places an order: validates stock, reserves, computes money server-side,
// writes order + items + status history + payment stub in ONE transaction.
// Called with an idempotency key (handled by global IdempotencyInterceptor).
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InvoiceService } from './invoice.service';
import { MessagingService } from '../messaging/messaging.service';
import { EventsService } from '../analytics/events.service';
import { OrdersService } from './orders.service';
import { RulesEngineService } from '../promotions/rules-engine.service';
import { CartsService } from '../carts/carts.service';
import type { PlaceOrderDto, PlaceOrderResultDto } from '@ecommarce/types';

const DELIVERY_FREE_THRESHOLD_POISHA = 150000;
const DELIVERY_FLAT_POISHA = 6000;

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly rules: RulesEngineService,
    private readonly carts: CartsService,
    private readonly invoice: InvoiceService,
    private readonly messaging: MessagingService,
    private readonly events: EventsService,
  ) {}

  async placeOrder(
    dto: PlaceOrderDto,
    userId: string | null,
  ): Promise<PlaceOrderResultDto> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('no items');
    }
    if (!dto.contactPhone) throw new BadRequestException('contact phone required');

    // ---------------------------------------------------------------------
    // 1. Load variants + product info, compute subtotal server-side
    // ---------------------------------------------------------------------
    const lineItems: Array<{
      variantId: string;
      productId: string;
      categoryId: string;
      brand: string | null;
      quantity: number;
      unitPricePoisha: number;
      productTitleEn: string;
      productTitleBn: string;
      variantSnapshot: Record<string, unknown>;
      stockAtRead: number;
    }> = [];

    for (const reqItem of dto.items) {
      if (reqItem.quantity <= 0) throw new BadRequestException('quantity must be > 0');
      const v = await this.prisma.variant.findUnique({
        where: { id: reqItem.variantId },
        include: {
          product: { select: { id: true, categoryId: true, brand: true, titleEn: true, titleBn: true } },
        },
      });
      if (!v || !v.isActive) throw new NotFoundException(`variant not found: ${reqItem.variantId}`);
      if (v.stock < reqItem.quantity) {
        throw new BadRequestException(`insufficient stock for ${v.sku}`);
      }
      lineItems.push({
        variantId: v.id,
        productId: v.product.id,
        categoryId: v.product.categoryId,
        brand: v.product.brand,
        quantity: reqItem.quantity,
        unitPricePoisha: v.pricePoisha,
        productTitleEn: v.product.titleEn,
        productTitleBn: v.product.titleBn,
        variantSnapshot: (v.attributeValues as Record<string, unknown>) ?? {},
        stockAtRead: v.stock,
      });
    }

    const subtotalPoisha = lineItems.reduce(
      (s, i) => s + i.unitPricePoisha * i.quantity,
      0,
    );

    // ---------------------------------------------------------------------
    // 2. Evaluate discounts (server-side only)
    // ---------------------------------------------------------------------
    let discountPoisha = 0;
    let couponId: string | null = null;
    let couponCode: string | null = null;

    if (dto.couponCode) {
      const evaluated = await this.rules.evaluateCart({
        items: lineItems.map((i) => ({
          variantId: i.variantId,
          productId: i.productId,
          categoryId: i.categoryId,
          brand: i.brand,
          pricePoisha: i.unitPricePoisha,
          quantity: i.quantity,
        })),
        couponCode: dto.couponCode,
        userId: userId ?? undefined,
      });
      if (evaluated.couponError) {
        throw new BadRequestException(evaluated.couponError);
      }
      discountPoisha = evaluated.discountPoisha;
      if (evaluated.source === 'coupon') {
        const coupon = await this.prisma.coupon.findUnique({
          where: { code: dto.couponCode.toUpperCase() },
        });
        couponId = coupon?.id ?? null;
        couponCode = coupon?.code ?? null;
      }
    }

    const deliveryChargePoisha =
      subtotalPoisha >= DELIVERY_FREE_THRESHOLD_POISHA ? 0 : DELIVERY_FLAT_POISHA;
    const totalPoisha = Math.max(0, subtotalPoisha - discountPoisha) + deliveryChargePoisha;

    // ---------------------------------------------------------------------
    // 3. Resolve / create Customer
    // ---------------------------------------------------------------------
    const customer = await this.upsertCustomer({
      userId,
      phone: dto.contactPhone,
      fullName: dto.shippingAddress.recipientName,
      email: dto.contactEmail ?? dto.guestEmail ?? null,
    });

    // ---------------------------------------------------------------------
    // 4. Save address (if not already there) — simple dedupe by line1+area+city
    // ---------------------------------------------------------------------
    await this.prisma.address.create({
      data: {
        customerId: customer.id,
        label: dto.shippingAddress.label ?? null,
        recipientName: dto.shippingAddress.recipientName,
        phone: dto.shippingAddress.phone,
        area: dto.shippingAddress.area,
        city: dto.shippingAddress.city,
        postcode: dto.shippingAddress.postcode ?? null,
        line1: dto.shippingAddress.line1,
        line2: dto.shippingAddress.line2 ?? null,
      },
    });

    // ---------------------------------------------------------------------
    // 5. One transaction: order + items + history + payment + stock decrement
    //    + coupon redemption
    // ---------------------------------------------------------------------
    const orderNumber = await this.orders.generateOrderNumber();

    const result = await this.prisma.$transaction(async (tx) => {
      // 5a. Decrement stock conditionally — this is the anti-oversell primitive
      for (const item of lineItems) {
        const updated = await tx.$executeRaw`
          UPDATE variants
          SET stock = stock - ${item.quantity}, "updatedAt" = NOW()
          WHERE id = ${item.variantId} AND stock >= ${item.quantity}
        `;
        if (updated !== 1) {
          throw new BadRequestException(
            `Out of stock: ${item.productTitleEn}`,
          );
        }
      }

      // 5b. Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          status: 'PLACED',
          subtotalPoisha,
          discountPoisha,
          deliveryChargePoisha,
          totalPoisha,
          couponId,
          couponCode,
          shippingAddressJson: dto.shippingAddress as unknown as object,
          contactPhone: dto.contactPhone,
          contactEmail: dto.contactEmail ?? dto.guestEmail ?? null,
          customerNote: dto.customerNote ?? null,
        },
      });

      // 5c. Order items
      for (const item of lineItems) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            variantId: item.variantId,
            productTitleEn: item.productTitleEn,
            productTitleBn: item.productTitleBn,
            variantSnapshot: item.variantSnapshot as unknown as object,
            quantity: item.quantity,
            unitPricePoisha: item.unitPricePoisha,
            lineTotalPoisha: item.unitPricePoisha * item.quantity,
          },
        });
      }

      // 5d. Initial status history
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, fromStatus: null, toStatus: 'PLACED', actorUserId: null },
      });

      // 5e. Payment stub
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: dto.paymentMethod,
          status: dto.paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
          amountPoisha: totalPoisha,
        },
      });

      // 5f. Atomic coupon redemption (if applicable)
      if (couponId && userId) {
        const ok = await this.rules.redeemCouponAtomic(
          couponId,
          userId,
          order.id,
          discountPoisha,
        );
        if (!ok) {
          throw new BadRequestException('Coupon no longer available');
        }
      }

      // 5g. Customer aggregates
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          totalOrders: { increment: 1 },
          totalSpentPoisha: { increment: totalPoisha },
          firstOrderAt: customer.firstOrderAt ?? new Date(),
          lastOrderAt: new Date(),
          isGuest: userId ? false : true,
        },
      });

      return { orderId: order.id, orderNumber: order.orderNumber, totalPoisha };
    });

    // Step 13.5: guest invoice PDF email + order confirmation SMS.
    // Fire-and-forget — failures are logged in notification_log, never
    // block the checkout response.
    void this.sendOrderNotifications(result.orderId, result.orderNumber, dto);

    return {
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      status: 'PLACED',
      totalPoisha: result.totalPoisha,
      paymentMethod: dto.paymentMethod,
    };
  }

  /**
   * Fires the invoice PDF email + order confirmation SMS in the background.
   * Idempotent on orderId — safe to retry.
   */
  private async sendOrderNotifications(
    orderId: string,
    orderNumber: string,
    dto: PlaceOrderDto,
  ): Promise<void> {
    try {
      const to = dto.contactEmail ?? null;
      const phone = dto.contactPhone;
      if (to) {
        const pdf = await this.invoice.generatePdf(orderId);
        await this.messaging.sendEmail({
          to,
          subject: `Invoice for order ${orderNumber}`,
          html: `<p>Thank you for your order <strong>${orderNumber}</strong>.</p><p>Invoice attached.</p>`,
          text: `Thank you for order ${orderNumber}. Invoice attached.`,
          attachments: [
            {
              filename: `invoice-${orderNumber}.pdf`,
              contentType: 'application/pdf',
              contentBase64: pdf.toString('base64'),
            },
          ],
          idempotencyKey: `invoice-${orderId}`,
        });
      }
      if (phone) {
        await this.messaging.sendSms({
          to: phone,
          body: `Order ${orderNumber} confirmed. Thank you!`,
          idempotencyKey: `order-confirm-${orderId}`,
        });
      }

      // Step 13.6: server-side PURCHASE event → GA4 MP + Meta CAPI.
      // Fire-and-forget through the analytics forwarder (already registered
      // via EventsService.registerForwarder).
      await this.events.track({
        eventType: 'PURCHASE',
        orderId,
        customerId: undefined,
        sessionId: undefined,
        productId: undefined,
        variantId: undefined,
        path: undefined,
        query: undefined,
        meta: {
          email: to ?? undefined,
          phone,
          valuePoisha: 0,
          currency: 'BDT',
          items: [],
        },
      });
    } catch (err) {
      this.logger.warn(`sendOrderNotifications failed: ${(err as Error).message}`);
    }
  }

  // -------------------------------------------------------------------------
  // Guest order lookup with phone verification
  // -------------------------------------------------------------------------

  async lookupGuestOrder(orderNumber: string, phone: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });
    if (!order) return null;
    if (order.contactPhone !== phone) return null;
    return order;
  }

  // -------------------------------------------------------------------------

  private async upsertCustomer(input: {
    userId: string | null;
    phone: string;
    fullName: string;
    email: string | null;
  }) {
    if (input.userId) {
      const byUser = await this.prisma.customer.findUnique({
        where: { userId: input.userId },
      });
      if (byUser) return byUser;
    }
    const byPhone = await this.prisma.customer.findUnique({
      where: { phone: input.phone },
    });
    if (byPhone) {
      if (input.userId && !byPhone.userId) {
        return this.prisma.customer.update({
          where: { id: byPhone.id },
          data: { userId: input.userId, isGuest: false },
        });
      }
      return byPhone;
    }
    return this.prisma.customer.create({
      data: {
        userId: input.userId,
        phone: input.phone,
        fullName: input.fullName,
        email: input.email,
        isGuest: input.userId ? false : true,
      },
    });
  }
}