// NestJS injection token + registry contract for PaymentAdapter implementations.
// Real adapters register here in Step 13.2; the mock registers in Step 13.1.
import type { PaymentAdapter, PaymentProvider } from '@ecommarce/types';

export const PAYMENT_ADAPTERS = Symbol('PAYMENT_ADAPTERS');

export interface PaymentAdapterRegistry {
  get(provider: PaymentProvider): PaymentAdapter;
  all(): PaymentAdapter[];
}

export type { PaymentAdapter, PaymentProvider };