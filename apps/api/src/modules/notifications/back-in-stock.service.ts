// apps/api/src/modules/notifications/back-in-stock.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DispatchService } from './dispatch.service';
import type { BackInStockSubscribeDto } from '@ecommarce/types';

@Injectable()
export class BackInStockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatch: DispatchService,
  ) {}

  async subscribe(dto: BackInStockSubscribeDto, customerId: string | null) {
    if (!dto.email && !dto.phone) throw new Error('email or phone required');
    return this.prisma.backInStockSubscription.create({
      data: {
        variantId: dto.variantId,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        customerId,
      },
    });
  }

  /**
   * Called when a variant is restocked. Fires every pending subscription
   * once (marks notifiedAt), so a second restock does not re-notify.
   */
  async notifyForVariant(variantId: string): Promise<{ notified: number }> {
    const pending = await this.prisma.backInStockSubscription.findMany({
      where: { variantId, notifiedAt: null },
    });
    let notified = 0;
    for (const sub of pending) {
      await this.dispatch.dispatch({
        templateKey: 'back_in_stock',
        channel: sub.email ? 'EMAIL' : 'SMS',
        recipient: sub.email ?? sub.phone ?? '',
        customerId: sub.customerId ?? undefined,
        variables: { variantId },
      });
      await this.prisma.backInStockSubscription.update({
        where: { id: sub.id },
        data: { notifiedAt: new Date() },
      });
      notified += 1;
    }
    return { notified };
  }
}