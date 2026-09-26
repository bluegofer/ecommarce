// Mock analytics adapter — logs events; used when GA4/Meta env not set.
import { Logger } from '@nestjs/common';
import type {
  AnalyticsAdapter,
  AnalyticsAdapterEvent,
  AnalyticsAdapterPlatform,
  AnalyticsDispatchResult,
} from '@ecommarce/types';

export class MockAnalyticsAdapter implements AnalyticsAdapter {
  public readonly platform: AnalyticsAdapterPlatform;
  private readonly logger = new Logger(MockAnalyticsAdapter.name);

  constructor(platform: AnalyticsAdapterPlatform) {
    this.platform = platform;
  }

  async send(event: AnalyticsAdapterEvent): Promise<AnalyticsDispatchResult> {
    this.logger.log(`[mock-analytics/${this.platform}] ${event.platform === 'GA4' ? (event as { name: string }).name : (event as { eventName: string }).eventName}`);
    return { ok: true, error: undefined };
  }
}