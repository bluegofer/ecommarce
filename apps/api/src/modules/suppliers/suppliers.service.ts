// apps/api/src/modules/suppliers/suppliers.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
  RecordSupplierPaymentInput,
} from '@ecommarce/types';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  // ---- CRUD ----

  list(params: { status?: string; q?: string; limit?: number; offset?: number }) {
    const where: Prisma.SupplierWhereInput = {};
    if (params.status) where.status = params.status as any;
    if (params.q) {
      where.OR = [
        { name: { contains: params.q, mode: 'insensitive' } },
        { code: { contains: params.q, mode: 'insensitive' } },
        { phone: { contains: params.q } },
      ];
    }
    return this.prisma.supplier.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
      skip: params.offset ?? 0,
    });
  }

  async findById(id: string) {
    const s = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        payments: { orderBy: { paidAt: 'desc' }, take: 20 },
        dues: { where: { status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] } } },
      },
    });
    if (!s) throw new NotFoundException(`Supplier ${id} not found`);
    return s;
  }

  async create(input: CreateSupplierInput) {
    const exists = await this.prisma.supplier.findUnique({ where: { code: input.code } });
    if (exists) throw new BadRequestException(`Supplier code ${input.code} already exists`);
    return this.prisma.supplier.create({
      data: {
        code: input.code,
        name: input.name,
        contactPerson: input.contactPerson,
        phone: input.phone,
        email: input.email,
        address: input.address as any,
        taxId: input.taxId,
        paymentTerms: input.paymentTerms,
        notes: input.notes,
        openingBalance: input.openingBalance ?? 0,
        currentDue: input.openingBalance ?? 0,
      },
    });
  }

  async update(id: string, input: UpdateSupplierInput) {
    const s = await this.prisma.supplier.findUnique({ where: { id } });
    if (!s) throw new NotFoundException(`Supplier ${id} not found`);
    return this.prisma.supplier.update({
      where: { id },
      data: {
        name: input.name,
        contactPerson: input.contactPerson,
        phone: input.phone,
        email: input.email,
        address: input.address as any,
        taxId: input.taxId,
        paymentTerms: input.paymentTerms,
        notes: input.notes,
        status: input.status,
      },
    });
  }

  // ---- Payment recording (auto-posts ledger: Dr AP, Cr Cash/Bank/MFS) ----

  async recordPayment(input: RecordSupplierPaymentInput) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: input.supplierId } });
    if (!supplier) throw new NotFoundException(`Supplier ${input.supplierId} not found`);
    if (input.amount <= 0) throw new BadRequestException('Payment amount must be > 0');

    return this.prisma.$transaction(async (tx) => {
      // Resolve ledger accounts by kind (CASH/BANK/MFS)
      const kindMap: Record<string, string> = { CASH: '1000-CASH', BANK: '1010-BANK', MFS: '1020-MFS' };
      const cashCode = kindMap[input.method];
      const cashAccount = await tx.ledgerAccount.findUnique({ where: { code: cashCode } });
      if (!cashAccount) throw new BadRequestException(`Ledger account ${cashCode} not seeded`);
      const apAccount = await tx.ledgerAccount.findUnique({ where: { code: '2000-AP' } });
      if (!apAccount) throw new BadRequestException('Ledger account 2000-AP not seeded');

      // Generate payment number: SP-YYYYMM-NNNNNN
      const now = new Date();
      const ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
      const count = await tx.supplierPayment.count({
        where: { paymentNumber: { startsWith: `SP-${ym}-` } },
      });
      const paymentNumber = `SP-${ym}-${String(count + 1).padStart(6, '0')}`;

      // Post journal first (Dr AP / Cr Cash)
      const journal = await this.ledger.postEntry(
        {
          entryDate: input.paidAt ?? new Date().toISOString(),
          description: `Supplier payment ${paymentNumber} — ${supplier.name}`,
          sourceType: 'SUPPLIER_PAYMENT',
          lines: [
            { ledgerAccountId: apAccount.id, debit: input.amount, credit: 0, description: 'Reduce AP' },
            { ledgerAccountId: cashAccount.id, debit: 0, credit: input.amount, description: 'Payment out' },
          ],
        },
        { tx, status: 'POSTED' },
      );

      // Create the payment record
      const payment = await tx.supplierPayment.create({
        data: {
          paymentNumber,
          supplierId: supplier.id,
          purchaseInvoiceId: input.purchaseInvoiceId,
          amount: input.amount,
          method: input.method,
          ledgerAccountId: cashAccount.id,
          journalEntryId: journal.id,
          reference: input.reference,
          paidAt: new Date(input.paidAt ?? Date.now()),
          notes: input.notes,
        },
      });

      // Decrement supplier currentDue (can go negative if advance — allowed)
      await tx.supplier.update({
        where: { id: supplier.id },
        data: { currentDue: { decrement: input.amount } },
      });

      // If linked to an invoice, decrement its balance + due rows
      if (input.purchaseInvoiceId) {
        const inv = await tx.purchaseInvoice.findUnique({ where: { id: input.purchaseInvoiceId } });
        if (inv) {
          const newPaid = inv.paidAmount + input.amount;
          const newStatus = newPaid >= inv.total ? 'PAID' : 'PARTIAL_PAID';
          await tx.purchaseInvoice.update({
            where: { id: inv.id },
            data: { paidAmount: newPaid, status: newStatus as any },
          });
          // Update matching SupplierDue
          const dues = await tx.supplierDue.findMany({
            where: { purchaseInvoiceId: inv.id, status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] } },
          });
          for (const due of dues) {
            const newPaidAmt = Math.min(due.paidAmount + input.amount, due.amount);
            const newBal = due.amount - newPaidAmt;
            const dueStatus = newBal <= 0 ? 'PAID' : 'PARTIAL';
            await tx.supplierDue.update({
              where: { id: due.id },
              data: { paidAmount: newPaidAmt, balance: newBal, status: dueStatus as any },
            });
          }
        }
      }

      return { payment, journalEntryId: journal.id };
    });
  }

  // ---- Payment history ----

  paymentHistory(supplierId: string, limit = 50) {
    return this.prisma.supplierPayment.findMany({
      where: { supplierId },
      orderBy: { paidAt: 'desc' },
      take: limit,
    });
  }

  // ---- Performance overview ----

  async performance(supplierId: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException(`Supplier ${supplierId} not found`);

    const pos = await this.prisma.purchaseOrder.findMany({
      where: { supplierId },
      include: { items: true, grns: { include: { items: true } } },
    });

    const totalOrders = pos.length;
    const totalOrdered = pos.reduce((s, po) => s + po.items.reduce((x, i) => x + i.orderedQty, 0), 0);
    const totalReceived = pos.reduce(
      (s, po) =>
        s + po.grns.reduce((x, g) => x + g.items.reduce((y, i) => y + i.receivedQty, 0), 0),
      0,
    );

    // Lead time: from PO sentAt to first GRN receivedAt (days)
    const leadTimes: number[] = [];
    let onTime = 0;
    let late = 0;
    for (const po of pos) {
      if (!po.sentAt) continue;
      const confirmedGrn = po.grns
        .filter((g) => g.status === 'CONFIRMED' && g.receivedAt)
        .sort((a, b) => +new Date(a.receivedAt!) - +new Date(b.receivedAt!))[0];
      if (confirmedGrn && confirmedGrn.receivedAt) {
        const days = (+new Date(confirmedGrn.receivedAt) - +new Date(po.sentAt)) / 86400000;
        leadTimes.push(days);
        if (po.expectedDate) {
          if (+new Date(confirmedGrn.receivedAt) <= +new Date(po.expectedDate)) onTime++;
          else late++;
        }
      }
    }

    const avgLeadTimeDays =
      leadTimes.length > 0 ? leadTimes.reduce((s, d) => s + d, 0) / leadTimes.length : 0;

    return {
      supplierId,
      totalOrders,
      totalOrdered,
      totalReceived,
      onTimeDeliveries: onTime,
      lateDeliveries: late,
      averageLeadTimeDays: Math.round(avgLeadTimeDays * 100) / 100,
      fulfillmentRate: totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 10000) / 10000 : 0,
    };
  }
}