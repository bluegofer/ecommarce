// apps/api/src/modules/purchase/purchase-invoices.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { assertInvTransition, type InvStatus } from './purchase-order-state-machine';
import type { CreatePurchaseInvoiceInput } from '@ecommarce/types';

@Injectable()
export class PurchaseInvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  list(params: { status?: string; supplierId?: string; limit?: number; offset?: number }) {
    const where: Prisma.PurchaseInvoiceWhereInput = {};
    if (params.status) where.status = params.status as any;
    if (params.supplierId) where.supplierId = params.supplierId;
    return this.prisma.purchaseInvoice.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
      take: params.limit ?? 50,
      skip: params.offset ?? 0,
    });
  }

  async findById(id: string) {
    const inv = await this.prisma.purchaseInvoice.findUnique({
      where: { id },
      include: { supplier: true, purchaseOrder: true, payments: true, dues: true },
    });
    if (!inv) throw new NotFoundException('Purchase invoice ' + id + ' not found');
    return inv;
  }

  create(input: CreatePurchaseInvoiceInput) {
    const total = input.subtotal - (input.discount ?? 0) + (input.tax ?? 0);
    if (total < 0) throw new BadRequestException('Invoice total cannot be negative');
    return this.prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: input.invoiceNumber,
        supplierId: input.supplierId,
        purchaseOrderId: input.purchaseOrderId,
        invoiceDate: new Date(input.invoiceDate),
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        subtotal: input.subtotal,
        discount: input.discount ?? 0,
        tax: input.tax ?? 0,
        total,
        status: 'DRAFT',
        notes: input.notes,
      },
    });
  }

  post(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const inv = await tx.purchaseInvoice.findUnique({ where: { id } });
      if (!inv) throw new NotFoundException('Purchase invoice ' + id + ' not found');
      assertInvTransition(inv.status as InvStatus, 'POSTED');

      const updated = await tx.purchaseInvoice.update({
        where: { id },
        data: { status: 'POSTED', postedAt: new Date() },
      });

      await tx.supplierDue.create({
        data: {
          supplierId: inv.supplierId,
          purchaseInvoiceId: inv.id,
          amount: inv.total,
          paidAmount: 0,
          balance: inv.total,
          dueDate: inv.dueDate,
          status: 'OPEN',
          notes: 'Auto-created from invoice ' + inv.invoiceNumber,
        },
      });

      return updated;
    });
  }

  void(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const inv = await tx.purchaseInvoice.findUnique({ where: { id } });
      if (!inv) throw new NotFoundException('Purchase invoice ' + id + ' not found');
      if (inv.paidAmount > 0) throw new BadRequestException('Cannot void an invoice with payments');
      assertInvTransition(inv.status as InvStatus, 'VOID');
      await tx.supplierDue.deleteMany({ where: { purchaseInvoiceId: id } });
      return tx.purchaseInvoice.update({ where: { id }, data: { status: 'VOID' } });
    });
  }
}