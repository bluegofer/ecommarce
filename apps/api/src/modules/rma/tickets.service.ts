// apps/api/src/modules/rma/tickets.service.ts
// Lightweight support ticket system with SLA aging list.
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  CreateTicketDto,
  ReplyTicketDto,
  SupportTicketDto,
  TicketMessageDto,
  TicketStatus,
} from '@ecommarce/types';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTicketDto, actorUserId: string | null): Promise<SupportTicketDto> {
    if (!dto.subject || dto.subject.trim().length < 3) {
      throw new BadRequestException('subject required');
    }
    if (!dto.body || dto.body.trim().length < 3) {
      throw new BadRequestException('body required');
    }
    const ticketNumber = `TCK-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()}`;

    const created = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        customerId: dto.customerId ?? null,
        orderId: dto.orderId ?? null,
        subject: dto.subject.trim(),
        status: 'OPEN',
        priority: dto.priority ?? 0,
        messages: {
          create: {
            fromStaff: false,
            actorUserId,
            body: dto.body.trim(),
          },
        },
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    return this.toDto(created, true);
  }

  async list(status?: TicketStatus): Promise<SupportTicketDto[]> {
    const rows = await this.prisma.supportTicket.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: 'asc' }, { lastMessageAt: 'desc' }],
      take: 200,
    });
    return rows.map((r) => this.toDto(r, false));
  }

  /**
   * SLA aging list: tickets ordered by how long they have been open.
   */
  async aging(): Promise<Array<SupportTicketDto & { ageHours: number }>> {
    const rows = await this.prisma.supportTicket.findMany({
      where: { status: { in: ['OPEN', 'PENDING'] } },
      orderBy: { lastMessageAt: 'asc' },
      take: 200,
    });
    const now = Date.now();
    return rows.map((r) => {
      const dto = this.toDto(r, false);
      return {
        ...dto,
        ageHours: Math.floor((now - new Date(r.lastMessageAt).getTime()) / 3_600_000),
      };
    });
  }

  async findOne(id: string): Promise<SupportTicketDto> {
    const row = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!row) throw new NotFoundException('ticket not found');
    return this.toDto(row, true);
  }

  async reply(id: string, dto: ReplyTicketDto, actorUserId: string | null): Promise<SupportTicketDto> {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('ticket not found');
    if (!dto.body || dto.body.trim().length < 1) {
      throw new BadRequestException('body required');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.ticketMessage.create({
        data: {
          ticketId: id,
          fromStaff: dto.fromStaff,
          actorUserId,
          body: dto.body.trim(),
        },
      });
      await tx.supportTicket.update({
        where: { id },
        data: {
          lastMessageAt: new Date(),
          status: dto.fromStaff ? 'PENDING' : 'OPEN',
        },
      });
    });
    return this.findOne(id);
  }

  async resolve(id: string): Promise<SupportTicketDto> {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('ticket not found');
    await this.prisma.supportTicket.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
    return this.findOne(id);
  }

  private toDto(
    r: {
      id: string;
      ticketNumber: string;
      customerId: string | null;
      orderId: string | null;
      subject: string;
      status: string;
      priority: number;
      lastMessageAt: Date;
      resolvedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      messages?: Array<{
        id: string;
        ticketId: string;
        fromStaff: boolean;
        actorUserId: string | null;
        body: string;
        createdAt: Date;
      }>;
    },
    withMessages: boolean,
  ): SupportTicketDto {
    const messages: TicketMessageDto[] | undefined = withMessages && r.messages
      ? r.messages.map((m) => ({
          id: m.id,
          ticketId: m.ticketId,
          fromStaff: m.fromStaff,
          actorUserId: m.actorUserId,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
        }))
      : undefined;
    return {
      id: r.id,
      ticketNumber: r.ticketNumber,
      customerId: r.customerId,
      orderId: r.orderId,
      subject: r.subject,
      status: r.status as TicketStatus,
      priority: r.priority,
      lastMessageAt: r.lastMessageAt.toISOString(),
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      messages,
    };
  }
}