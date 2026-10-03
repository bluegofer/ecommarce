// apps/api/src/modules/purchase/requisitions.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { assertReqTransition, type ReqStatus } from './purchase-order-state-machine';
import type { CreateRequisitionInput } from '@ecommarce/types';

@Injectable()
export class RequisitionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextReqNumber(tx: Prisma.TransactionClient): Promise<string> {
    const now = new Date();
    const ym = String(now.getUTCFullYear()) + String(now.getUTCMonth() + 1).padStart(2, '0');
    const c = await tx.purchaseRequisition.count({
      where: { reqNumber: { startsWith: 'REQ-' + ym + '-' } },
    });
    return 'REQ-' + ym + '-' + String(c + 1).padStart(6, '0');
  }

  list(params: { status?: string; branchId?: string; limit?: number; offset?: number }) {
    const where: Prisma.PurchaseRequisitionWhereInput = {};
    if (params.status) where.status = params.status as any;
    if (params.branchId) where.branchId = params.branchId;
    return this.prisma.purchaseRequisition.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
      skip: params.offset ?? 0,
      include: { items: true },
    });
  }

  async findById(id: string) {
    const r = await this.prisma.purchaseRequisition.findUnique({
      where: { id },
      include: { items: true, purchaseOrders: true },
    });
    if (!r) throw new NotFoundException('Requisition ' + id + ' not found');
    return r;
  }

  create(input: CreateRequisitionInput, requestedById?: string) {
    if (!input.items?.length) throw new BadRequestException('At least one line required');
    return this.prisma.$transaction(async (tx) => {
      const reqNumber = await this.nextReqNumber(tx);
      return tx.purchaseRequisition.create({
        data: {
          reqNumber,
          branchId: input.branchId,
          notes: input.notes,
          requestedById,
          status: 'DRAFT',
          items: {
            create: input.items.map((i) => ({
              variantId: i.variantId,
              requestedQty: i.requestedQty,
              notes: i.notes,
            })),
          },
        },
        include: { items: true },
      });
    });
  }

  async transition(id: string, to: ReqStatus, approvedById?: string) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.purchaseRequisition.findUnique({ where: { id } });
      if (!r) throw new NotFoundException('Requisition ' + id + ' not found');
      assertReqTransition(r.status as ReqStatus, to);
      return tx.purchaseRequisition.update({
        where: { id },
        data: {
          status: to,
          approvedById: to === 'APPROVED' ? approvedById : undefined,
          approvedAt: to === 'APPROVED' ? new Date() : undefined,
        },
      });
    });
  }
}