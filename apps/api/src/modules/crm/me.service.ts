// apps/api/src/modules/crm/me.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OtpService } from '../auth/otp.service';
import type { ChangePhoneDto } from './dto/change-phone.dto';
import type { AddWishlistItemDto, MergeWishlistDto } from './dto/wishlist.dto';

export interface MeProfileDto {
  userId: string;
  customerId: string | null;
  phone: string;
  email: string | null;
  fullName: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  totalOrders: number;
  totalSpentPoisha: number;
  hasPassword: boolean;
}

export interface MeAddressDto {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  area: string;
  city: string;
  postcode: string | null;
  line1: string;
  line2: string | null;
  isDefault: boolean;
}

export interface UpsertAddressDto {
  label?: string;
  recipientName: string;
  phone: string;
  area: string;
  city: string;
  postcode?: string;
  line1: string;
  line2?: string;
  isDefault?: boolean;
}
export interface WishlistItemDto {
  productId: string;
  slug: string;
  titleEn: string;
  titleBn: string;
  imageUrl: string | null;
  minPricePoisha: number;
  addedAt: string;
}

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
  ) {}

  /** Resolve the Customer for the logged-in user. Auto-create if missing. */
  private async resolveCustomer(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('user not found');

    let customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) {
      // First time this user opens /me — create a Customer row linked to them.
      // This is safe: userId is unique, and the user already passed phone verification.
      customer = await this.prisma.customer.create({
        data: {
          userId: user.id,
          phone: user.phone,
          email: user.email,
          fullName: user.fullName,
          isGuest: false,
        },
      });
    }
    return { user, customer };
  }

  async getProfile(userId: string): Promise<MeProfileDto> {
    const { user, customer } = await this.resolveCustomer(userId);
    return {
      userId: user.id,
      customerId: customer.id,
      hasPassword: user.passwordHash !== null,
      phone: user.phone,
      email: user.email,
      fullName: user.fullName,
      phoneVerified: Boolean(user.phoneVerifiedAt),
      emailVerified: Boolean(user.emailVerifiedAt),
      totalOrders: customer.totalOrders,
      totalSpentPoisha: customer.totalSpentPoisha,
    };
  }

  async updateProfile(
    userId: string,
    input: { fullName?: string; email?: string | null },
  ): Promise<MeProfileDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('user not found');

    const data: { fullName?: string; email?: string | null } = {};
    if (typeof input.fullName === 'string') {
      const name = input.fullName.trim();
      if (name.length < 2) throw new BadRequestException('fullName too short');
      data.fullName = name;
    }
    if (input.email !== undefined) {
      const email = input.email?.trim() || null;
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new BadRequestException('invalid email');
      }
      data.email = email;
    }

    await this.prisma.user.update({ where: { id: userId }, data });

    // Mirror to Customer for consistency
    const { customer } = await this.resolveCustomer(userId);
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        fullName: data.fullName ?? undefined,
        email: data.email === undefined ? undefined : data.email,
      },
    });

    return this.getProfile(userId);
  }

  /**
   * Change the authenticated user's phone number.
   * Precondition: caller must have already requested OTP for `newPhone`
   * via POST /auth/otp/request.
   * On success: updates user.phone + user.phoneVerifiedAt + customer.phone.
   */
  async changePhone(userId: string, dto: ChangePhoneDto): Promise<MeProfileDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('user not found');

    const newPhone = dto.newPhone.trim();
    if (newPhone === user.phone) {
      throw new BadRequestException('New phone is the same as current phone');
    }

    // Uniqueness — another user already owns this phone?
    const existing = await this.prisma.user.findUnique({
      where: { phone: newPhone },
    });
    if (existing && existing.id !== user.id) {
      throw new BadRequestException(
        'This phone is already registered to another account',
      );
    }

    // Verify OTP — throws BadRequestException on failure
    await this.otp.verify(newPhone, dto.otp);

    // Apply change (single transaction: user + customer)
    const { customer } = await this.resolveCustomer(userId);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { phone: newPhone, phoneVerifiedAt: new Date() },
      }),
      this.prisma.customer.update({
        where: { id: customer.id },
        data: { phone: newPhone },
      }),
    ]);

    return this.getProfile(userId);
  }

  /**
   * Verify the currently-held phone.
   * Precondition: caller must have already requested OTP for their current
   * phone via POST /auth/otp/request.
   * On success: sets user.phoneVerifiedAt to now.
   */
  async verifyCurrentPhone(userId: string, otp: string): Promise<MeProfileDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('user not found');

    if (user.phoneVerifiedAt) {
      // Already verified — idempotent success
      return this.getProfile(userId);
    }

    await this.otp.verify(user.phone, otp);

    await this.prisma.user.update({
      where: { id: userId },
      data: { phoneVerifiedAt: new Date() },
    });

    return this.getProfile(userId);
  }

  async listAddresses(userId: string): Promise<MeAddressDto[]> {
    const { customer } = await this.resolveCustomer(userId);
    const rows = await this.prisma.address.findMany({
      where: { customerId: customer.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((a) => this.toAddressDto(a));
  }

  async createAddress(userId: string, dto: UpsertAddressDto): Promise<MeAddressDto> {
    const { customer } = await this.resolveCustomer(userId);
    this.validateAddress(dto);

    // If new address is default, unset others in a transaction.
    const created = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { customerId: customer.id, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.address.create({
        data: {
          customerId: customer.id,
          label: dto.label?.trim() || null,
          recipientName: dto.recipientName.trim(),
          phone: dto.phone.trim(),
          area: dto.area.trim(),
          city: dto.city.trim(),
          postcode: dto.postcode?.trim() || null,
          line1: dto.line1.trim(),
          line2: dto.line2?.trim() || null,
          isDefault: Boolean(dto.isDefault),
        },
      });
    });
    return this.toAddressDto(created);
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpsertAddressDto,
  ): Promise<MeAddressDto> {
    const { customer } = await this.resolveCustomer(userId);
    this.validateAddress(dto);

    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, customerId: customer.id },
    });
    if (!existing) throw new NotFoundException('address not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { customerId: customer.id, isDefault: true, id: { not: addressId } },
          data: { isDefault: false },
        });
      }
      return tx.address.update({
        where: { id: addressId },
        data: {
          label: dto.label?.trim() || null,
          recipientName: dto.recipientName.trim(),
          phone: dto.phone.trim(),
          area: dto.area.trim(),
          city: dto.city.trim(),
          postcode: dto.postcode?.trim() || null,
          line1: dto.line1.trim(),
          line2: dto.line2?.trim() || null,
          isDefault: Boolean(dto.isDefault),
        },
      });
    });
    return this.toAddressDto(updated);
  }

  async deleteAddress(userId: string, addressId: string): Promise<{ ok: true }> {
    const { customer } = await this.resolveCustomer(userId);
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, customerId: customer.id },
    });
    if (!existing) throw new NotFoundException('address not found');
    await this.prisma.address.delete({ where: { id: addressId } });
    return { ok: true };
  }

  private validateAddress(dto: UpsertAddressDto) {
    if (!dto.recipientName?.trim()) throw new BadRequestException('recipientName required');
    if (!dto.phone?.trim() || !/^\+?8801[3-9]\d{8}$/.test(dto.phone.replace(/\s/g, ''))) {
      throw new BadRequestException('valid BD phone required');
    }
    if (!dto.area?.trim()) throw new BadRequestException('area required');
    if (!dto.city?.trim()) throw new BadRequestException('city required');
    if (!dto.line1?.trim()) throw new BadRequestException('line1 required');
  }

  private toAddressDto(a: {
    id: string;
    label: string | null;
    recipientName: string;
    phone: string;
    area: string;
    city: string;
    postcode: string | null;
    line1: string;
    line2: string | null;
    isDefault: boolean;
  }): MeAddressDto {
    return {
      id: a.id,
      label: a.label,
      recipientName: a.recipientName,
      phone: a.phone,
      area: a.area,
      city: a.city,
      postcode: a.postcode,
      line1: a.line1,
      line2: a.line2,
      isDefault: a.isDefault,
    };
  }

  // ────────────────────────────────────────────────────────────
  // Wishlist (T1-6)
  // ────────────────────────────────────────────────────────────

  async listWishlist(userId: string): Promise<WishlistItemDto[]> {
    const rows = await this.prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
      include: {
        product: {
          include: {
            media: { orderBy: { sortOrder: 'asc' }, take: 1 },
            variants: {
              where: { isActive: true },
              orderBy: { pricePoisha: 'asc' },
              take: 1,
            },
          },
        },
      },
    });
    return rows.map((r) => this.toWishlistDto(r));
  }

  async addWishlistItem(userId: string, dto: AddWishlistItemDto): Promise<WishlistItemDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('product not found');

    const row = await this.prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId: dto.productId } },
      create: { userId, productId: dto.productId },
      update: {}, // idempotent — no duplicate insert
      include: {
        product: {
          include: {
            media: { orderBy: { sortOrder: 'asc' }, take: 1 },
            variants: {
              where: { isActive: true },
              orderBy: { pricePoisha: 'asc' },
              take: 1,
            },
          },
        },
      },
    });
    return this.toWishlistDto(row);
  }

  async removeWishlistItem(userId: string, productId: string): Promise<{ ok: true }> {
    await this.prisma.wishlistItem.deleteMany({ where: { userId, productId } });
    return { ok: true };
  }

  /**
   * Merge guest (localStorage) wishlist into the signed-in user's server
   * wishlist. Idempotent — re-merging the same items is a no-op.
   * Called once after login / OAuth completion (DECISIONS.md Step-8.7
   * pattern, applied to wishlist).
   */
  async mergeWishlist(userId: string, dto: MergeWishlistDto): Promise<{ merged: number }> {
    if (!dto.items?.length) return { merged: 0 };

    // Filter to existing products only — a guest cart may reference
    // products that were unpublished since.
    const productIds = Array.from(new Set(dto.items.map((i) => i.productId)));
    const existing = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    const validIds = new Set(existing.map((p) => p.id));

    const rows = dto.items.filter((i) => validIds.has(i.productId));

    if (rows.length === 0) return { merged: 0 };

    // createMany with skipDuplicates — atomic, idempotent, one round-trip.
    await this.prisma.wishlistItem.createMany({
      data: rows.map((i) => ({
        userId,
        productId: i.productId,
      })),
      skipDuplicates: true,
    });

    return { merged: rows.length };
  }

  private toWishlistDto(r: {
    productId: string;
    addedAt: Date;
    product: {
      slug: string;
      titleEn: string;
      titleBn: string;
      media: { url: string }[];
      variants: { pricePoisha: number }[];
    };
  }): WishlistItemDto {
    const firstVariant = r.product.variants[0];
    return {
      productId: r.productId,
      slug: r.product.slug,
      titleEn: r.product.titleEn,
      titleBn: r.product.titleBn,
      imageUrl: r.product.media[0]?.url ?? null,
      minPricePoisha: firstVariant?.pricePoisha ?? 0,
      addedAt: r.addedAt.toISOString(),
    };
  }
}