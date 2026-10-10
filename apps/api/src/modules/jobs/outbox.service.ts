import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

export interface OutboxEvent {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  /** Call from inside a Prisma $transaction so the event is atomic with the change. */
  async enqueue(tx: PrismaService, event: OutboxEvent): Promise<void> {
    await tx.outbox.create({
      data: {
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload as object,
      },
    });
  }
}