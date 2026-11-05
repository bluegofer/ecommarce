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

  async list(search?: string, page = 1, pageSize = 20): Promise<{ items: CustomerDto[]; total: number; page: number; pageSize: number }> {
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
    const total = rows.length;
    return {
      items: rows.map((r) => this.toDto(r)),
      total,
      page: 1,
      pageSize: rows.length,
    };
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

  async getPayments(customerId: string) {
    const c = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!c) throw new NotFoundException('customer not found');

    const orders = await this.prisma.order.findMany({
      where: { customerId },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);

    const payments = orderIds.length
      ? await this.prisma.payment.findMany({
          where: { orderId: { in: orderIds } },
          orderBy: { createdAt: 'desc' },
          take: 200,
        })
      : [];

    const paid = payments.filter((p) => p.paidAt !== null);
    const totalPaidPoisha = paid.reduce((s, p) => s + p.amountPoisha, 0);
    const byMethod: Record<string, number> = {};
    for (const p of payments) {
      byMethod[p.method] = (byMethod[p.method] ?? 0) + 1;
    }

    return {
      stats: {
        totalTransactions: payments.length,
        totalPaidPoisha,
        byMethod,
      },
      payments: payments.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        amountPoisha: p.amountPoisha,
        method: p.method,
        status: p.status,
        gatewayRef: p.gatewayRef,
        createdAt: p.createdAt.toISOString(),
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      })),
    };
  }

  async getReviews(customerId: string) {
    const c = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!c) throw new NotFoundException('customer not found');

    const reviews = await this.prisma.review.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const productIds = Array.from(new Set(reviews.map((r) => r.productId)));
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, titleEn: true, titleBn: true, slug: true },
        })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const total = reviews.length;
    const avgRating = total === 0 ? 0 : reviews.reduce((s, r) => s + r.rating, 0) / total;

    return {
      stats: {
        totalReviews: total,
        avgRating,
      },
      reviews: reviews.map((r) => {
        const prod = productMap.get(r.productId);
        return {
          id: r.id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          product: {
            id: r.productId,
            titleEn: prod?.titleEn ?? '',
            titleBn: prod?.titleBn ?? '',
            slug: prod?.slug ?? '',
          },
        };
      }),
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
