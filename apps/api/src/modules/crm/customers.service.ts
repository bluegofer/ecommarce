// apps/api/src/modules/crm/customers.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  AddCustomerNoteDto,
  CustomerDto,
  CustomerProfileDto,
  CustomerStatus,
} from '@ecommarce/types';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(search?: string): Promise<CustomerDto[]> {
    const rows = await this.prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { phone: { contains: search } },
              { email: { contains: search, mode: 'insensitive' } },
              { fullName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { lastOrderAt: { sort: 'desc', nulls: 'last' } },
      take: 200,
    });
    return rows.map((r) => this.toDto(r));
  }

  async findOne(id: string): Promise<CustomerDto> {
    const c = await this.prisma.customer.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('customer not found');
    return this.toDto(c);
  }

  async profile(id: string): Promise<CustomerProfileDto> {
    const c = await this.prisma.customer.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('customer not found');

    const [addresses, notes, orders] = await Promise.all([
      this.prisma.address.findMany({ where: { customerId: id }, orderBy: { createdAt: 'desc' } }),
      this.prisma.customerNote.findMany({ where: { customerId: id }, orderBy: { createdAt: 'desc' } }),
      this.prisma.order.findMany({
        where: { customerId: id },
        orderBy: { placedAt: 'desc' },
        take: 5,
        select: { id: true, orderNumber: true, status: true, totalPoisha: true, placedAt: true },
      }),
    ]);

    return {
      ...this.toDto(c),
      addresses: addresses.map((a) => ({
        id: a.id,
        recipientName: a.recipientName,
        phone: a.phone,
        area: a.area,
        city: a.city,
        line1: a.line1,
        isDefault: a.isDefault,
      })),
      notesTimeline: notes.map((n) => ({
        id: n.id,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
        actorUserId: n.actorUserId,
      })),
      orderSummary: {
        total: c.totalOrders,
        last5: orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          totalPoisha: o.totalPoisha,
          placedAt: o.placedAt.toISOString(),
        })),
      },
    };
  }

  async addNote(id: string, dto: AddCustomerNoteDto, actorUserId: string | null) {
    const c = await this.prisma.customer.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('customer not found');
    await this.prisma.customerNote.create({
      data: { customerId: id, body: dto.body, actorUserId },
    });
    return this.profile(id);
  }

  async lookupByPhone(phone: string): Promise<CustomerDto | null> {
    const c = await this.prisma.customer.findUnique({ where: { phone } });
    return c ? this.toDto(c) : null;
  }

  private toDto(c: {
    id: string;
    userId: string | null;
    phone: string;
    email: string | null;
    fullName: string;
    isGuest: boolean;
    status: string;
    totalOrders: number;
    totalSpentPoisha: number;
    firstOrderAt: Date | null;
    lastOrderAt: Date | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): CustomerDto {
    return {
      id: c.id,
      userId: c.userId,
      phone: c.phone,
      email: c.email,
      fullName: c.fullName,
      isGuest: c.isGuest,
      status: c.status as CustomerStatus,
      totalOrders: c.totalOrders,
      totalSpentPoisha: c.totalSpentPoisha,
      firstOrderAt: c.firstOrderAt ? c.firstOrderAt.toISOString() : null,
      lastOrderAt: c.lastOrderAt ? c.lastOrderAt.toISOString() : null,
      notes: c.notes,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}