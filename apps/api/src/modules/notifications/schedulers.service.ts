// apps/api/src/modules/notifications/schedulers.service.ts
// Abandoned-cart scheduler (AC-81). Runs on an interval; a cart becomes
// "abandoned" once its lastActivityAt is older than IDLE_MINUTES. First
// nudge is email; a second nudge (with coupon if configured) fires after
// SECOND_NUDGE_MINUTES. Only two nudges per cart.
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DispatchService } from './dispatch.service';

const IDLE_MINUTES = 60;
const SECOND_NUDGE_MINUTES = 24 * 60;
const INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class SchedulersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulersService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatch: DispatchService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tickAbandonedCarts().catch((err) => this.logger.error('abandoned tick', err));
    }, INTERVAL_MS);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Called directly by tests with a synthetic "now" and thresholds
   * so no real clock manipulation is needed.
   */
  async tickAbandonedCarts(
    now: Date = new Date(),
    idleMinutes = IDLE_MINUTES,
    secondMinutes = SECOND_NUDGE_MINUTES,
  ): Promise<{ nudged: number }> {
    const idleBefore = new Date(now.getTime() - idleMinutes * 60_000);

    const candidates = await this.prisma.cart.findMany({
      where: {
        state: 'ACTIVE',
        lastActivityAt: { lt: idleBefore },
        reminderCount: { lt: 2 },
        customerId: { not: null },
      },
      include: { customer: true, items: true },
      take: 50,
    });

    let nudged = 0;
    for (const cart of candidates) {
      if (!cart.customer) continue;
      if (cart.items.length === 0) continue;

      const isFirst = cart.reminderCount === 0;
      if (!isFirst) {
        const secondThreshold = new Date(
          (cart.reminderSentAt ?? now).getTime() + secondMinutes * 60_000,
        );
        if (now < secondThreshold) continue;
      }

      // First nudge: no coupon. Second: with coupon when configured.
      const variables: Record<string, string> = {
        name: cart.customer.fullName,
        itemCount: String(cart.items.length),
      };
      if (!isFirst) {
        const coupon = await this.prisma.coupon.findFirst({
          where: { isActive: true, code: { startsWith: 'CART' } },
        });
        if (coupon) variables.couponCode = coupon.code;
      }

      await this.dispatch.dispatch({
        templateKey: isFirst ? 'cart.abandoned' : 'cart.abandoned_second',
        channel: 'EMAIL',
        recipient: cart.customer.email ?? cart.customer.phone,
        customerId: cart.customer.id,
        variables,
      });

      await this.prisma.cart.update({
        where: { id: cart.id },
        data: {
          reminderSentAt: now,
          reminderCount: cart.reminderCount + 1,
          state: cart.reminderCount + 1 >= 2 ? 'ABANDONED' : 'ACTIVE',
        },
      });
      nudged += 1;
    }
    return { nudged };
  }
}