// apps/api/src/modules/promotions/rules-engine.service.ts
// Server-side promotion rules engine (TDD §6.3).
//   - Evaluates automatic discounts + a coupon against a cart
//   - Picks the single best discount unless the coupon is combinable
//   - All math is integer poisha
//   - Never trusts a client-sent total; caller passes cart items verbatim
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  CartContext,
  CartItemContext,
  CouponDto,
  DiscountBreakdownEntry,
  EvaluateCartDto,
  EvaluateCartResultDto,
} from '@ecommarce/types';
import type { Coupon, AutomaticDiscount } from '@prisma/client';

@Injectable()
export class RulesEngineService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Public entry — evaluate cart with optional coupon
  // -------------------------------------------------------------------------

  async evaluateCart(dto: EvaluateCartDto): Promise<EvaluateCartResultDto> {
    if (!dto.items || dto.items.length === 0) {
      return {
        subtotalPoisha: 0,
        discountPoisha: 0,
        source: 'none',
        breakdown: [],
      };
    }

    const cart = this.buildContext(dto);
    const now = new Date();

    // Auto discounts + coupon (if any)
    const autos = await this.prisma.automaticDiscount.findMany({
      where: { isActive: true },
    });
    const autoCandidates = autos
      .filter((a) => this.isWithinWindow(a.validFrom, a.validUntil, now))
      .map((a) => this.computeAutomaticDiscount(a, cart))
      .filter((x): x is DiscountBreakdownEntry => x !== null);

    // Best automatic (single) — we never stack autos
    const bestAuto = autoCandidates.reduce<DiscountBreakdownEntry | null>(
      (best, x) => (best === null || x.amountPoisha > best.amountPoisha ? x : best),
      null,
    );

    let couponEntry: DiscountBreakdownEntry | null = null;
    let couponError: string | undefined;
    let couponRow: Coupon | null = null;

    if (dto.couponCode) {
      const result = await this.evaluateCoupon(dto.couponCode, cart, now);
      if ('error' in result) {
        couponError = result.error;
      } else {
        couponRow = result.coupon;
        couponEntry = result.entry;
      }
    }

    // ---------------------------------------------------------------------
    // Selection rule: single best unless coupon is combinable
    // ---------------------------------------------------------------------
    const couponCombinable = couponRow?.combinable === true;

    if (couponEntry && bestAuto && couponCombinable) {
      // combine
      const breakdown: DiscountBreakdownEntry[] = [bestAuto, couponEntry];
      const total = breakdown.reduce((s, e) => s + e.amountPoisha, 0);
      return {
        subtotalPoisha: cart.subtotalPoisha,
        discountPoisha: Math.min(total, cart.subtotalPoisha),
        source: 'coupon',
        couponCode: dto.couponCode,
        breakdown,
      };
    }

    if (couponEntry && (!bestAuto || couponEntry.amountPoisha >= bestAuto.amountPoisha)) {
      return {
        subtotalPoisha: cart.subtotalPoisha,
        discountPoisha: couponEntry.amountPoisha,
        source: 'coupon',
        couponCode: dto.couponCode,
        breakdown: [couponEntry],
        couponError,
      };
    }

    if (bestAuto) {
      return {
        subtotalPoisha: cart.subtotalPoisha,
        discountPoisha: bestAuto.amountPoisha,
        source: 'automatic',
        breakdown: [bestAuto],
        couponError,
      };
    }

    return {
      subtotalPoisha: cart.subtotalPoisha,
      discountPoisha: 0,
      source: 'none',
      breakdown: [],
      couponError,
    };
  }

  // -------------------------------------------------------------------------
  // Coupon evaluation
  // -------------------------------------------------------------------------

  async evaluateCoupon(
    code: string,
    cart: CartContext,
    now: Date = new Date(),
  ): Promise<
    | { ok: true; coupon: Coupon; entry: DiscountBreakdownEntry }
    | { ok: false; error: string }
  > {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!coupon) return { ok: false, error: 'Coupon not found' };
    if (!coupon.isActive) return { ok: false, error: 'Coupon is inactive' };
    if (!this.isWithinWindow(coupon.validFrom, coupon.validUntil, now)) {
      return { ok: false, error: 'Coupon is not valid right now' };
    }
    if (coupon.timesRedeemed >= Number.MAX_SAFE_INTEGER) {
      return { ok: false, error: 'Coupon exhausted' };
    }
    if (coupon.totalUsageLimit !== null && coupon.timesRedeemed >= coupon.totalUsageLimit) {
      return { ok: false, error: 'Coupon usage limit reached' };
    }
    if (cart.subtotalPoisha < coupon.minOrderPoisha) {
      return { ok: false, error: `Minimum order is ${coupon.minOrderPoisha} poisha` };
    }
    if (coupon.firstOrderOnly && !cart.isFirstOrder) {
      return { ok: false, error: 'First-order-only coupon' };
    }
    if (cart.userId && coupon.perCustomerLimit !== null) {
      const used = await this.prisma.couponRedemption.count({
        where: { couponId: coupon.id, userId: cart.userId },
      });
      if (used >= coupon.perCustomerLimit) {
        return { ok: false, error: 'Per-customer limit reached' };
      }
    }

    const scoped = this.scopedSubtotal(coupon.rulesJson as CouponScopeLike, cart);

    const discount = this.computeDiscountAmount(
      coupon.type,
      coupon.valuePercent,
      coupon.valuePoisha,
      scoped,
      cart.subtotalPoisha,
    );
    if (discount <= 0) return { ok: false, error: 'Coupon yields no discount' };

    const capped =
      coupon.maxDiscountPoisha !== null && discount > coupon.maxDiscountPoisha
        ? coupon.maxDiscountPoisha
        : discount;

    return {
      ok: true,
      coupon,
      entry: {
        label: `Coupon ${coupon.code}`,
        amountPoisha: capped,
        source: 'coupon',
        refId: coupon.id,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Automatic discount evaluation
  // -------------------------------------------------------------------------

  private computeAutomaticDiscount(
    auto: AutomaticDiscount,
    cart: CartContext,
  ): DiscountBreakdownEntry | null {
    if (auto.minOrderPoisha > cart.subtotalPoisha) return null;
    const scoped = this.scopedSubtotal(auto.scopeJson as CouponScopeLike, cart);
    const discount = this.computeDiscountAmount(
      auto.type,
      auto.valuePercent,
      auto.valuePoisha,
      scoped,
      cart.subtotalPoisha,
    );
    if (discount <= 0) return null;
    const capped =
      auto.maxDiscountPoisha !== null && discount > auto.maxDiscountPoisha
        ? auto.maxDiscountPoisha
        : discount;
    return {
      label: `Auto: ${auto.name}`,
      amountPoisha: capped,
      source: 'automatic',
      refId: auto.id,
    };
  }

  // -------------------------------------------------------------------------
  // Math helpers (integer poisha only)
  // -------------------------------------------------------------------------

  private computeDiscountAmount(
    type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING',
    valuePercent: number | null,
    valuePoisha: number | null,
    scopedSubtotal: number,
    orderSubtotal: number,
  ): number {
    if (type === 'PERCENTAGE') {
      if (valuePercent === null) return 0;
      return Math.floor((scopedSubtotal * valuePercent) / 100);
    }
    if (type === 'FIXED') {
      if (valuePoisha === null) return 0;
      return Math.min(valuePoisha, scopedSubtotal);
    }
    // FREE_SHIPPING handled by checkout (applies to shipping), not this engine
    return 0;
  }

  private scopedSubtotal(scope: CouponScopeLike | null, cart: CartContext): number {
    if (!scope) return cart.subtotalPoisha;
    const hasAny =
      (scope.categoryIds && scope.categoryIds.length > 0) ||
      (scope.productIds && scope.productIds.length > 0) ||
      (scope.brands && scope.brands.length > 0);
    if (!hasAny) return cart.subtotalPoisha;

    let total = 0;
    for (const item of cart.items) {
      const matches =
        (!scope.categoryIds || scope.categoryIds.includes(item.categoryId)) &&
        (!scope.productIds || scope.productIds.includes(item.productId)) &&
        (!scope.brands || (item.brand && scope.brands.includes(item.brand)));
      if (matches) total += item.pricePoisha * item.quantity;
    }
    return total;
  }

  private isWithinWindow(
    from: Date | null,
    until: Date | null,
    now: Date,
  ): boolean {
    if (from && now < from) return false;
    if (until && now > until) return false;
    return true;
  }

  private buildContext(dto: EvaluateCartDto): CartContext {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('cart cannot be empty');
    }
    const items: CartItemContext[] = dto.items.map((i) => ({
      variantId: i.variantId,
      productId: i.productId,
      categoryId: i.categoryId,
      brand: i.brand,
      pricePoisha: i.pricePoisha,
      quantity: i.quantity,
    }));
    const subtotal = items.reduce((s, i) => s + i.pricePoisha * i.quantity, 0);
    return {
      items,
      subtotalPoisha: subtotal,
      userId: dto.userId,
      isFirstOrder: dto.isFirstOrder,
    };
  }

  // -------------------------------------------------------------------------
  // Atomic coupon redemption (TDD §11.2). Called from the order transaction.
  // Returns true if the redemption succeeded, false if exhausted.
  // -------------------------------------------------------------------------

  async redeemCouponAtomic(
    couponId: string,
    userId: string,
    orderId: string | null,
    discountPoisha: number,
  ): Promise<boolean> {
    // Conditional UPDATE — only one caller can win the last slot.
    const result = await this.prisma.$executeRaw`
      UPDATE coupons
      SET "timesRedeemed" = "timesRedeemed" + 1, "updatedAt" = NOW()
      WHERE id = ${couponId}
        AND "isActive" = true
        AND ("totalUsageLimit" IS NULL OR "timesRedeemed" < "totalUsageLimit")
    `;
    if (result !== 1) return false;

    await this.prisma.couponRedemption.create({
      data: { couponId, userId, orderId, discountPoisha },
    });
    return true;
  }
}

interface CouponScopeLike {
  categoryIds?: string[];
  productIds?: string[];
  brands?: string[];
}