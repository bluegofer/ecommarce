// apps/api/src/modules/promotions/flash-sale-scheduler.service.ts
// Simple interval-based scheduler. In Step 12 this becomes an AWS EventBridge
// schedule calling the same `tick()` method. The clock is injectable for tests.
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { FlashSalesService } from './flash-sales.service';

@Injectable()
export class FlashSaleSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FlashSaleSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly intervalMs = 60_000; // 1 minute

  constructor(private readonly flashSales: FlashSalesService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tickAndLog();
    }, this.intervalMs);
    // don't hold the process open in tests
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tickAndLog(): Promise<void> {
    try {
      const { expired } = await this.flashSales.tick(new Date());
      if (expired > 0) {
        this.logger.log(`Deactivated ${expired} expired flash sale(s)`);
      }
    } catch (err) {
      this.logger.error('Flash sale tick failed', err as Error);
    }
  }
}