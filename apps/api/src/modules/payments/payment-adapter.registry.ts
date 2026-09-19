// Concrete registry — resolves a provider name to its adapter.
import { NotFoundException } from '@nestjs/common';
import type {
  PaymentAdapter,
  PaymentProvider,
} from '@ecommarce/types';
import type { PaymentAdapterRegistry } from './payment-adapter.interface';

export class PaymentAdapterRegistryImpl implements PaymentAdapterRegistry {
  private readonly map = new Map<PaymentProvider, PaymentAdapter>();

  constructor(adapters: PaymentAdapter[]) {
    for (const a of adapters) {
      this.map.set(a.provider, a);
    }
  }

  get(provider: PaymentProvider): PaymentAdapter {
    const a = this.map.get(provider);
    if (!a) {
      throw new NotFoundException(`No payment adapter registered for ${provider}`);
    }
    return a;
  }

  all(): PaymentAdapter[] {
    return Array.from(this.map.values());
  }
}