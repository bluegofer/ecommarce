// apps/api/src/modules/purchase/grn.service.ts
// A.5 CHAIN CLOSURE - GRN confirm runs ONE transaction:
//   1) stock increment   2) InventoryAdjustment(RESTOCK)
//   3) PO item receivedQty + PO status
//   4) supplier.currentDue   5) SupplierDue (AP aging)
//   6) balanced journal: Inventory Dr / Supplier AP Cr
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { PurchaseOrdersService } from './purchase-orders.service';
import { assertGrnTransition, type GrnStatus } from './purchase-order-state-machine';
import type { CreateGRNInput } from '@ecommarce/types';

@Injectable()
export class GRNService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly poService: PurchaseOrdersService,
  ) {}

  private async nextGrnNumber(tx: Prisma.TransactionClient): Promise<string> {
    const now = new Date();
    const ym = String(now.getUTCFullYear()) + String(now.getUTCMonth() + 1).padStart(2, '0');
    const c = await tx.gRN.count({ where: { grnNumber: { startsWith: 'GRN-' + ym + '-' } } });
    return 'GRN-' + ym + '-' + String(c + 1).padStart(6, '0');
  }

  list(params: { status?: string; poId?: string; branchId?: string; limit?: number; offset?: number }) {
    const where: Prisma.GRNWhereInput = {};
    if (params.status) where.status = params.status as any;
    if (params.poId) where.purchaseOrderId = params.poId;
    if (params.branchId) where.branchId = params.branchId;
    return this.prisma.gRN.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
      skip: params.offset ?? 0,
      include: { items: true, purchaseOrder: { include: { supplier: true } } },
    });
  }

  async findById(id: string) {
    const grn = await this.prisma.gRN.findUnique({
      where: { id },
      include: { items: true, purchaseOrder: { include: { supplier: true, items: true } } },
    });
    if (!grn) throw new NotFoundException('GRN ' + id + ' not found');
    return grn;
  }

  create(input: CreateGRNInput, receivedById?: string) {
    if (!input.items?.length) throw new BadRequestException('At least one line required');
    return this.prisma.$transaction(async (tx) => {
      const grnNumber = await this.nextGrnNumber(tx);
      return tx.gRN.create({
        data: {
          grnNumber,
          purchaseOrderId: input.purchaseOrderId,
          branchId: input.branchId,
          notes: input.notes,
          receivedById,
          status: 'DRAFT',
          items: {
            create: input.items.map((i) => ({
              poItemId: i.poItemId,
              variantId: i.variantId,
              receivedQty: i.receivedQty,
              unitCost: i.unitCost,
              lineTotal: i.receivedQty * i.unitCost,
              notes: i.notes,
            })),
          },
        },
        include: { items: true },
      });
    });
  }

  confirm(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const grn = await tx.gRN.findUnique({
        where: { id },
        include: { items: true, purchaseOrder: true },
      });
      if (!grn) throw new NotFoundException('GRN ' + id + ' not found');
      assertGrnTransition(grn.status as GrnStatus, 'CONFIRMED');
      if (!grn.items.length) throw new BadRequestException('GRN has no items');

      const supplier = await tx.supplier.findUnique({
        where: { id: grn.purchaseOrder.supplierId },
      });
      if (!supplier) throw new BadRequestException('Supplier missing');

      const invAccount = await tx.ledgerAccount.findUnique({ where: { code: '1200-INV' } });
      const apAccount = await tx.ledgerAccount.findUnique({ where: { code: '2000-AP' } });
      if (!invAccount || !apAccount) {
        throw new BadRequestException('Ledger accounts 1200-INV / 2000-AP not seeded');
      }

      let totalCost = 0;
      for (const item of grn.items) {
        const before = await tx.variant.findUnique({
          where: { id: item.variantId },
          select: { stock: true },
        });
        if (!before) throw new BadRequestException('Variant ' + item.variantId + ' not found');
        const updated = await tx.$executeRaw`
          UPDATE variants
          SET stock = stock + ${item.receivedQty}, "updatedAt" = NOW()
          WHERE id = ${item.variantId}
        `;
        if (updated !== 1) {
          throw new BadRequestException('Variant ' + item.variantId + ' not found');
        }
        await tx.inventoryAdjustment.create({
          data: {
            variantId: item.variantId,
            delta: item.receivedQty,
            reason: 'RESTOCK',
            reasonNote: 'GRN ' + grn.grnNumber + ' receipt (PO ' + grn.purchaseOrder.poNumber + ')',
            stockBefore: before.stock,
            stockAfter: before.stock + item.receivedQty,
            actorUserId: grn.receivedById,
            referenceId: grn.id,
          },
        });
        totalCost += item.lineTotal;

        if (item.poItemId) {
          await tx.purchaseOrderItem.update({
            where: { id: item.poItemId },
            data: { receivedQty: { increment: item.receivedQty } },
          });
        }
      }

      const confirmed = await tx.gRN.update({
        where: { id },
        data: { status: 'CONFIRMED', receivedAt: new Date() },
        include: { items: true },
      });

      await this.poService.recomputeStatusFromReceipts(tx, grn.purchaseOrderId);

      await tx.supplier.update({
        where: { id: supplier.id },
        data: { currentDue: { increment: totalCost } },
      });

      await tx.supplierDue.create({
        data: {
          supplierId: supplier.id,
          amount: totalCost,
          paidAmount: 0,
          balance: totalCost,
          status: 'OPEN',
          notes: 'Auto-created from GRN ' + grn.grnNumber,
        },
      });

      const journal = await this.ledger.postEntry(
        {
          entryDate: new Date().toISOString(),
          description: 'Goods received ' + grn.grnNumber + ' - ' + supplier.name,
          sourceType: 'GRN',
          sourceId: grn.id,
          branchId: grn.branchId,
          lines: [
            { ledgerAccountId: invAccount.id, debit: totalCost, credit: 0, description: 'Inventory in' },
            { ledgerAccountId: apAccount.id, debit: 0, credit: totalCost, description: 'AP up' },
          ],
        },
        { tx, status: 'POSTED' },
      );

      return { grn: confirmed, journalEntryId: journal.id, totalCost };
    });
  }

  cancel(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const grn = await tx.gRN.findUnique({ where: { id } });
      if (!grn) throw new NotFoundException('GRN ' + id + ' not found');
      assertGrnTransition(grn.status as GrnStatus, 'CANCELLED');
      return tx.gRN.update({ where: { id }, data: { status: 'CANCELLED' } });
    });
  }
}