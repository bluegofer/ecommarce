// apps/api/src/modules/carts/carts.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { RulesEngineService } from '../promotions/rules-engine.service';
import type {
  AddCartItemDto,
  ApplyCouponDto,
  CartDto,
  CartItemDto,
  UpdateCartItemDto,
} from '@ecommarce/types';

const DELIVERY_FREE_THRESHOLD_POISHA = 150000;
const DELIVERY_FLAT_POISHA = 6000;

@Injectable()
export class CartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rules: RulesEngineService,
  ) {}

  async getOrCreateByCustomer(customerId: string) {
    const existing = await this.prisma.cart.findFirst({
      where: { customerId, state: 'ACTIVE' },
    });
    if (existing) return existing;
    return this.prisma.cart.create({ data: { customerId, state: 'ACTIVE' } });
  }

  async getOrCreateByGuestToken(token?: string) {
    if (token) {
      const found = await this.prisma.cart.findUnique({ where: { guestToken: token } });
      if (found) return found;
    }
    const newToken = token ?? randomUUID();
    return this.prisma.cart.create({
      data: { guestToken: newToken, state: 'ACTIVE' },
    });
  }

  async addItem(cartId: string, dto: AddCartItemDto): Promise<CartDto> {
    if (dto.quantity <= 0) throw new BadRequestException('quantity must be > 0');
    const variant = await this.prisma.variant.findUnique({ where: { id: dto.variantId } });
    if (!variant || !variant.isActive) throw new NotFoundException('variant not found');

    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId, variantId: dto.variantId } },
    });
    if (existing) {
      const next = existing.quantity + dto.quantity;
      if (next > variant.stock) throw new BadRequestException('not enough stock');
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: next, savedForLater: false },
      });
    } else {
      if (dto.quantity > variant.stock) throw new BadRequestException('not enough stock');
      await this.prisma.cartItem.create({
        data: { cartId, variantId: dto.variantId, quantity: dto.quantity },
      });
    }
    await this.touch(cartId);
    return this.getCartById(cartId);
  }

  async updateItem(cartId: string, itemId: string, dto: UpdateCartItemDto): Promise<CartDto> {
    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item || item.cartId !== cartId) throw new NotFoundException('cart item not found');
    const data: Record<string, unknown> = {};
    if (dto.quantity !== undefined) {
      if (dto.quantity <= 0) {
        await this.prisma.cartItem.delete({ where: { id: itemId } });
        await this.touch(cartId);
        return this.getCartById(cartId);
      }
      const variant = await this.prisma.variant.findUnique({ where: { id: item.variantId } });
      if (variant && dto.quantity > variant.stock) {
        throw new BadRequestException('not enough stock');
      }
      data.quantity = dto.quantity;
    }
    if (dto.savedForLater !== undefined) data.savedForLater = dto.savedForLater;
    await this.prisma.cartItem.update({ where: { id: itemId }, data });
    await this.touch(cartId);
    return this.getCartById(cartId);
  }

  async removeItem(cartId: string, itemId: string): Promise<CartDto> {
    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item || item.cartId !== cartId) throw new NotFoundException('cart item not found');
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    await this.touch(cartId);
    return this.getCartById(cartId);
  }

  async applyCoupon(cartId: string, dto: ApplyCouponDto): Promise<CartDto> {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId } });
    if (!cart) throw new NotFoundException('cart not found');
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { couponCode: dto.couponCode ? dto.couponCode.toUpperCase() : null },
    });
    await this.touch(cartId);
    return this.getCartById(cartId);
  }

  async mergeGuestIntoCustomer(guestToken: string, customerId: string): Promise<CartDto> {
    const guest = await this.prisma.cart.findUnique({
      where: { guestToken },
      include: { items: true },
    });
    if (!guest) {
      const cart = await this.getOrCreateByCustomer(customerId);
      return this.getCartById(cart.id);
    }
    const target = await this.getOrCreateByCustomer(customerId);

    for (const g of guest.items) {
      const exists = await this.prisma.cartItem.findUnique({
        where: { cartId_variantId: { cartId: target.id, variantId: g.variantId } },
      });
      if (exists) {
        await this.prisma.cartItem.update({
          where: { id: exists.id },
          data: { quantity: exists.quantity + g.quantity },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: target.id,
            variantId: g.variantId,
            quantity: g.quantity,
            savedForLater: g.savedForLater,
          },
        });
      }
    }

    await this.prisma.cart.update({ where: { id: guest.id }, data: { state: 'MERGED' } });
    await this.touch(target.id);
    return this.getCartById(target.id);
  }

  async clear(cartId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({ where: { cartId } });
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { couponCode: null, lastActivityAt: new Date() },
    });
  }

  async getCartById(cartId: string): Promise<CartDto> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: { orderBy: { addedAt: 'asc' } } },
    });
    if (!cart) throw new NotFoundException('cart not found');

    const active: CartItemDto[] = [];
    const saved: CartItemDto[] = [];

    for (const item of cart.items) {
      const variant = await this.prisma.variant.findUnique({
        where: { id: item.variantId },
        include: { product: { select: { id: true, slug: true, titleEn: true, titleBn: true } } },
      });
      if (!variant) continue;
      const dto: CartItemDto = {
        id: item.id,
        cartId: item.cartId,
        variantId: item.variantId,
        quantity: item.quantity,
        savedForLater: item.savedForLater,
        productId: variant.product.id,
        productSlug: variant.product.slug,
        titleEn: variant.product.titleEn,
        titleBn: variant.product.titleBn,
        pricePoisha: variant.pricePoisha,
        stock: variant.stock,
        sku: variant.sku,
        imageUrl: null,
        lineTotalPoisha: variant.pricePoisha * item.quantity,
      };
      if (item.savedForLater) saved.push(dto);
      else active.push(dto);
    }

    const subtotal = active.reduce((s, i) => s + (i.lineTotalPoisha ?? 0), 0);

    let discountPoisha = 0;
    if (subtotal > 0) {
      const items = [];
      for (const i of active) {
        const v = await this.prisma.variant.findUnique({
          where: { id: i.variantId },
          include: { product: { select: { id: true, categoryId: true, brand: true } } },
        });
        if (!v) continue;
        items.push({
          variantId: i.variantId,
          productId: v.product.id,
          categoryId: v.product.categoryId,
          brand: v.product.brand,
          pricePoisha: v.pricePoisha,
          quantity: i.quantity,
        });
      }
      const evaluated = await this.rules.evaluateCart({
        items,
        couponCode: cart.couponCode ?? undefined,
      });
      discountPoisha = evaluated.discountPoisha;
    }

    const deliveryCharge =
      subtotal === 0 || subtotal >= DELIVERY_FREE_THRESHOLD_POISHA ? 0 : DELIVERY_FLAT_POISHA;
    const total = Math.max(0, subtotal - discountPoisha) + deliveryCharge;

    return {
      id: cart.id,
      customerId: cart.customerId,
      guestToken: cart.guestToken,
      couponCode: cart.couponCode,
      items: active,
      savedForLater: saved,
      subtotalPoisha: subtotal,
      discountPoisha,
      deliveryChargePoisha: deliveryCharge,
      totalPoisha: total,
    };
  }

  async getByGuestToken(token: string): Promise<CartDto | null> {
    const cart = await this.prisma.cart.findUnique({ where: { guestToken: token } });
    if (!cart) return null;
    return this.getCartById(cart.id);
  }

  async getByCustomer(customerId: string): Promise<CartDto> {
    const cart = await this.getOrCreateByCustomer(customerId);
    return this.getCartById(cart.id);
  }

  private async touch(cartId: string): Promise<void> {
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { lastActivityAt: new Date() },
    });
  }
}