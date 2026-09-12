// apps/api/src/modules/crm/me.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

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

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

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
}