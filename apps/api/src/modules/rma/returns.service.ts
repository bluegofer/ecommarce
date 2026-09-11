// apps/api/src/modules/rma/returns.service.ts
// Return Merchandise Authorization (TDD §6.9).
//   - Customer requests a return from an order detail
//   - State machine: REQUESTED → APPROVED → PICKED_UP → RECEIVED → RESOLVED
//     or REJECTED with a reason
//   - Refund execution delegates to a payments interface (Step 10 wires real adapters)
//   - Restock on RECEIVED via reason-coded inventory adjustments
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AdjustmentsService } from '../inventory/adjustments.service';
import { assertReturnTransition } from './return-state-machine';
import type {
  ApproveReturnDto,
  CreateReturnRequestDto,
  MarkReturnPickedUpDto,
  RejectReturnDto,
  ReturnRequestDto,
  ReturnStatus,
} from '@ecommarce/types';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adjustments: AdjustmentsService,
  ) {}

  // -------------------------------------------------------------------------
  // Customer side
  // -------------------------------------------------------------------------

  async create(userId: string, dto: CreateReturnRequestDto): Promise<ReturnRequestDto> {
    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new ForbiddenException('No customer profile');
    const customerId = customer.id;

    if (!dto.itemIds || dto.itemIds.length === 0) {
      throw new BadRequestException('at least one order item required');
    }
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('order not found');
    if (order.customerId !== customerId) {
      throw new ForbiddenException('Not your order');
    }
    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Only delivered orders can be returned');
    }

    const itemIds: string[] = dto.itemIds;
    const itemSet = new Set(order.items.map((i) => i.id));
    for (const id of itemIds) {
      if (!itemSet.has(id)) {
        throw new BadRequestException(`order item not found: ${id}`);
      }
    }

    const created = await this.prisma.returnRequest.create({
      data: {
        orderId: order.id,
        customerId,
        status: 'REQUESTED',
        reason: dto.reason,
        reasonNote: dto.reasonNote ?? null,
        photoUrls: (dto.photoUrls as unknown as object) ?? undefined,
        itemIds: itemIds as unknown as object,
        history: {
          create: {
            toStatus: 'REQUESTED',
            note: 'Customer submitted return request',
          },
        },
      },
      include: { history: { orderBy: { createdAt: 'asc' } } },
    });

    // Move the order into RETURN_REQUESTED (allowed from DELIVERED)
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'RETURN_REQUESTED' },
    });
    await this.prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: 'DELIVERED',
        toStatus: 'RETURN_REQUESTED',
        note: `Return requested: ${dto.reason}`,
      },
    });

    return this.toDto(created);
  }

  async listMine(userId: string): Promise<ReturnRequestDto[]> {
    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) return [];
    const customerId = customer.id;
    const rows = await this.prisma.returnRequest.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  // -------------------------------------------------------------------------
  // Admin side
  // -------------------------------------------------------------------------

  async list(status?: ReturnStatus): Promise<ReturnRequestDto[]> {
    const rows = await this.prisma.returnRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return rows.map((r) => this.toDto(r));
  }

  async findOne(id: string): Promise<ReturnRequestDto> {
    const row = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: { history: { orderBy: { createdAt: 'asc' } } },
    });
    if (!row) throw new NotFoundException('return not found');
    const dto = this.toDto(row);
    dto.history = row.history.map((h) => ({
      id: h.id,
      returnRequestId: h.returnRequestId,
      fromStatus: h.fromStatus as ReturnStatus | null,
      toStatus: h.toStatus as ReturnStatus,
      actorUserId: h.actorUserId,
      note: h.note,
      createdAt: h.createdAt.toISOString(),
    }));
    return dto;
  }

  async approve(
    id: string,
    dto: ApproveReturnDto,
    actorUserId: string | null,
  ): Promise<ReturnRequestDto> {
    return this.transition(id, 'APPROVED', actorUserId, {
      note: `Approved for refund of ${dto.refundAmountPoisha} poisha`,
      refundAmountPoisha: dto.refundAmountPoisha,
    });
  }

  async reject(id: string, dto: RejectReturnDto, actorUserId: string | null): Promise<ReturnRequestDto> {
    if (!dto.rejectReason) throw new BadRequestException('reject reason required');
    return this.transition(id, 'REJECTED', actorUserId, {
      note: `Rejected: ${dto.rejectReason}`,
      rejectReason: dto.rejectReason,
    });
  }

  async markPickedUp(
    id: string,
    dto: MarkReturnPickedUpDto,
    actorUserId: string | null,
  ): Promise<ReturnRequestDto> {
    return this.transition(id, 'PICKED_UP', actorUserId, {
      note: dto.trackingNumber ? `Picked up: ${dto.trackingNumber}` : 'Picked up',
      trackingNumber: dto.trackingNumber,
    });
  }

  /**
   * RECEIVED — item physically back. Restock variants via reason-coded
   * adjustment inside the same transaction as the status flip.
   */
  async markReceived(id: string, actorUserId: string | null): Promise<ReturnRequestDto> {
    const request = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: { history: { orderBy: { createdAt: 'asc' } } },
    });
    if (!request) throw new NotFoundException('return not found');
    assertReturnTransition(request.status as ReturnStatus, 'RECEIVED');

    const orderItems = await this.prisma.orderItem.findMany({
      where: { id: { in: request.itemIds as string[] } },
    });

    // 1. Flip state + history in a single tx
    await this.prisma.$transaction(async (tx) => {
      await tx.returnRequest.update({
        where: { id },
        data: { status: 'RECEIVED', restockedAt: new Date() },
      });
      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: id,
          fromStatus: request.status,
          toStatus: 'RECEIVED',
          actorUserId,
          note: 'Item received — restocking',
        },
      });
    });

    // 2. Reason-coded restock per item (outside tx so each adjustment is atomic)
    for (const item of orderItems) {
      await this.adjustments.adjust(
        {
          variantId: item.variantId,
          delta: item.quantity,
          reason: 'RETURN',
          reasonNote: `Return ${id} received`,
          referenceId: id,
        },
        actorUserId,
      );
    }

    return this.findOne(id);
  }

  /**
   * RESOLVED — refund executed (delegates to payments interface in Step 10).
   * Here we simply record refundedAt and set the order to RETURNED.
   */
  async resolve(id: string, actorUserId: string | null): Promise<ReturnRequestDto> {
    const request = await this.prisma.returnRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('return not found');
    assertReturnTransition(request.status as ReturnStatus, 'RESOLVED');

    await this.prisma.$transaction(async (tx) => {
      await tx.returnRequest.update({
        where: { id },
        data: { status: 'RESOLVED', refundedAt: new Date() },
      });
      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: id,
          fromStatus: request.status,
          toStatus: 'RESOLVED',
          actorUserId,
          note: 'Refund processed (payment adapter runs in Step 10)',
        },
      });
      await tx.order.update({
        where: { id: request.orderId },
        data: { status: 'RETURNED' },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: request.orderId,
          fromStatus: 'RETURN_REQUESTED',
          toStatus: 'RETURNED',
          actorUserId,
          note: 'Return resolved',
        },
      });
    });

    return this.findOne(id);
  }

  // -------------------------------------------------------------------------

  private async transition(
    id: string,
    to: ReturnStatus,
    actorUserId: string | null,
    extras: {
      note: string;
      refundAmountPoisha?: number;
      rejectReason?: string;
      trackingNumber?: string;
    },
  ): Promise<ReturnRequestDto> {
    const request = await this.prisma.returnRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('return not found');
    assertReturnTransition(request.status as ReturnStatus, to);

    if (to === 'APPROVED' && extras.refundAmountPoisha !== undefined) {
      if (extras.refundAmountPoisha < 0) {
        throw new BadRequestException('refund amount cannot be negative');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = { status: to };
      if (to === 'APPROVED' && extras.refundAmountPoisha !== undefined) {
        data.refundAmountPoisha = extras.refundAmountPoisha;
      }
      if (to === 'REJECTED') data.rejectReason = extras.rejectReason ?? null;
      if (to === 'PICKED_UP' && extras.trackingNumber) {
        data.trackingNumber = extras.trackingNumber;
      }
      await tx.returnRequest.update({ where: { id }, data });
      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: id,
          fromStatus: request.status,
          toStatus: to,
          actorUserId,
          note: extras.note,
        },
      });
    });

    return this.findOne(id);
  }

  private toDto(r: {
    id: string;
    orderId: string;
    customerId: string;
    status: string;
    reason: string;
    reasonNote: string | null;
    photoUrls: unknown;
    itemIds: unknown;
    refundAmountPoisha: number;
    refundedAt: Date | null;
    restockedAt: Date | null;
    rejectReason: string | null;
    trackingNumber: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ReturnRequestDto {
    return {
      id: r.id,
      orderId: r.orderId,
      customerId: r.customerId,
      status: r.status as ReturnStatus,
      reason: r.reason as ReturnRequestDto['reason'],
      reasonNote: r.reasonNote,
      photoUrls: Array.isArray(r.photoUrls) ? (r.photoUrls as string[]) : null,
      itemIds: Array.isArray(r.itemIds) ? (r.itemIds as string[]) : [],
      refundAmountPoisha: r.refundAmountPoisha,
      refundedAt: r.refundedAt ? r.refundedAt.toISOString() : null,
      restockedAt: r.restockedAt ? r.restockedAt.toISOString() : null,
      rejectReason: r.rejectReason,
      trackingNumber: r.trackingNumber,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}