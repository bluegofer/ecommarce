// apps/api/src/modules/purchase/purchase-orders.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { assertPoTransition, type PoStatus } from './purchase-order-state-machine';
import type { CreatePurchaseOrderInput } from '@ecommarce/types';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextPoNumber(tx: Prisma.TransactionClient): Promise<string> {
    const now = new Date();
    const ym = String(now.getUTCFullYear()) + String(now.getUTCMonth() + 1).padStart(2, '0');
    const c = await tx.purchaseOrder.count({ where: { poNumber: { startsWith: 'PO-' + ym + '-' } } });
    return 'PO-' + ym + '-' + String(c + 1).padStart(6, '0');
  }

  list(params: { status?: string; supplierId?: string; branchId?: string; limit?: number; offset?: number }) {
    const where: Prisma.PurchaseOrderWhereInput = {};
    if (params.status) where.status = params.status as any;
    if (params.supplierId) where.supplierId = params.supplierId;
    if (params.branchId) where.branchId = params.branchId;
    return this.prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
      skip: params.offset ?? 0,
      include: { items: true, supplier: true },
    });
  }

  async findById(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true, supplier: true, invoices: true, grns: { include: { items: true } } },
    });
    if (!po) throw new NotFoundException('Purchase order ' + id + ' not found');
    return po;
  }

  create(input: CreatePurchaseOrderInput, createdById?: string) {
    if (!input.items?.length) throw new BadRequestException('At least one line required');
    const subtotal = input.items.reduce((s, i) => s + i.orderedQty * i.unitCost, 0);
    const discount = input.discount ?? 0;
    const total = subtotal - discount;

    return this.prisma.$transaction(async (tx) => {
      const poNumber = await this.nextPoNumber(tx);
      return tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: input.supplierId,
          branchId: input.branchId,
          requisitionId: input.requisitionId,
          expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
          subtotal,
          discount,
          total,
          notes: input.notes,
          createdById,
          status: 'DRAFT',
          items: {
            create: input.items.map((i) => ({
              variantId: i.variantId,
              orderedQty: i.orderedQty,
              unitCost: i.unitCost,
              lineTotal: i.orderedQty * i.unitCost,
              notes: i.notes,
            })),
          },
        },
        include: { items: true },
      });
    });
  }

  async transition(id: string, to: PoStatus) {
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({ where: { id } });
      if (!po) throw new NotFoundException('Purchase order ' + id + ' not found');
      assertPoTransition(po.status as PoStatus, to);
      return tx.purchaseOrder.update({
        where: { id },
        data: {
          status: to,
          sentAt: to === 'SENT' ? new Date() : undefined,
          closedAt: to === 'CLOSED' ? new Date() : undefined,
        },
      });
    });
  }

  async recomputeStatusFromReceipts(tx: Prisma.TransactionClient, poId: string): Promise<void> {
    const po = await tx.purchaseOrder.findUnique({ where: { id: poId }, include: { items: true } });
    if (!po) return;
    const allReceived = po.items.every((i) => i.receivedQty >= i.orderedQty);
    const anyReceived = po.items.some((i) => i.receivedQty > 0);
    let next: PoStatus = po.status as PoStatus;
    if (allReceived && anyReceived) next = 'RECEIVED';
    else if (anyReceived) next = 'PARTIAL_RECEIVED';
    if (next !== po.status) {
      assertPoTransition(po.status as PoStatus, next);
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          status: next,
          closedAt: next === 'CLOSED' || next === 'RECEIVED' ? new Date() : undefined,
        },
      });
    }
  }
}