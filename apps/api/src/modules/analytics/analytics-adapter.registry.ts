// Registry for server-side analytics adapters (GA4 + Meta CAPI).
import { Injectable } from '@nestjs/common';
import type { AnalyticsAdapter, AnalyticsAdapterPlatform } from '@ecommarce/types';

@Injectable()
export class AnalyticsAdapterRegistry {
  private readonly map = new Map<AnalyticsAdapterPlatform, AnalyticsAdapter>();

  constructor(adapters: AnalyticsAdapter[]) {
    for (const a of adapters) this.map.set(a.platform, a);
  }

  all(): AnalyticsAdapter[] {
    return Array.from(this.map.values());
  }

  get(platform: AnalyticsAdapterPlatform): AnalyticsAdapter | undefined {
    return this.map.get(platform);
  }
}