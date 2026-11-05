// apps/api/src/modules/analytics/events.service.ts
// First-party event intake (TDD §6.12). All storefront events land here.
// A server-side forwarder interface can ship the same events to GA4 MP /
// Meta CAPI in Step 10 — its shape is defined here so the storefront code
// does not change.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { TrackEventDto } from '@ecommarce/types';

export interface EventForwarder {
  forward(event: TrackEventDto & { id: string; createdAt: Date }): Promise<void>;
}

@Injectable()
export class EventsService {
  private forwarders: EventForwarder[] = [];

  constructor(private readonly prisma: PrismaService) {}

  registerForwarder(f: EventForwarder): void {
    this.forwarders.push(f);
  }

  async track(dto: TrackEventDto): Promise<{ id: string }> {
    const row = await this.prisma.analyticsEvent.create({
      data: {
        eventType: dto.eventType,
        sessionId: dto.sessionId ?? null,
        customerId: dto.customerId ?? null,
        productId: dto.productId ?? null,
        variantId: dto.variantId ?? null,
        orderId: dto.orderId ?? null,
        path: dto.path ?? null,
        query: dto.query ?? null,
        meta: (dto.meta as unknown as object) ?? undefined,
      },
    });

    // Side effect: SEARCH events also bump the search_terms table for trending.
    if (dto.eventType === 'SEARCH' && dto.query && dto.query.trim().length >= 2) {
      const term = dto.query.trim().toLowerCase();
      const existing = await this.prisma.searchTerm.findFirst({
        where: { term },
      });
      if (existing) {
        await this.prisma.searchTerm.update({
          where: { id: existing.id },
          data: { hits: { increment: 1 } },
        });
      } else {
        await this.prisma.searchTerm.create({ data: { term, hits: 1 } });
      }
    }

    // Fire-and-forget forwards to any registered server-side forwarders
    for (const f of this.forwarders) {
      void f
        .forward({ ...dto, id: row.id, createdAt: row.createdAt })
        .catch(() => undefined);
    }
    return { id: row.id };
  }
}