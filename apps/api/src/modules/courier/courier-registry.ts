// Concrete registry — resolves a courier provider to its adapter.
import { NotFoundException } from '@nestjs/common';
import type { CourierAdapter, CourierProvider } from '@ecommarce/types';
import type { CourierAdapterRegistry } from './courier-adapter.interface';

export class CourierAdapterRegistryImpl implements CourierAdapterRegistry {
  private readonly map = new Map<CourierProvider, CourierAdapter>();

  constructor(adapters: CourierAdapter[]) {
    for (const a of adapters) {
      this.map.set(a.provider, a);
    }
  }

  get(provider: CourierProvider): CourierAdapter {
    const a = this.map.get(provider);
    if (!a) {
      throw new NotFoundException(`No courier adapter registered for ${provider}`);
    }
    return a;
  }

  all(): CourierAdapter[] {
    return Array.from(this.map.values());
  }
}