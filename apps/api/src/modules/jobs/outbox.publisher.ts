import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

const POLL_INTERVAL_MS = 5000;
const BATCH_SIZE = 50;

@Injectable()
export class OutboxPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisher.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS);
    this.logger.log(`Outbox publisher started (every ${POLL_INTERVAL_MS}ms)`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** One poll cycle - safe to call from tests directly. */
  async tick(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let processed = 0;

    try {
      const events = await this.prisma.outbox.findMany({
        where: { status: 'PENDING', availableAt: { lte: new Date() } },
        orderBy: { createdAt: 'asc' },
        take: BATCH_SIZE,
      });

      for (const ev of events) {
        try {
          this.logger.debug(`Publishing ${ev.eventType} (${ev.id})`);
          await this.prisma.outbox.update({
            where: { id: ev.id },
            data: { status: 'PUBLISHED', publishedAt: new Date(), attempts: ev.attempts + 1 },
          });
          processed++;
        } catch (err) {
          const attempts = ev.attempts + 1;
          const backoffMs = Math.min(60_000, 2 ** attempts * 1000);
          await this.prisma.outbox.update({
            where: { id: ev.id },
            data: {
              attempts,
              lastError: err instanceof Error ? err.message : String(err),
              status: attempts >= 10 ? 'DLQ' : 'PENDING',
              availableAt: new Date(Date.now() + backoffMs),
            },
          });
        }
      }
    } finally {
      this.running = false;
    }

    return processed;
  }
}