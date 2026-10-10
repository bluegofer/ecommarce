// NestJS injection token + registry contract for CourierAdapter implementations.
// Pathao mock registers in Step 13.1; real Pathao in 13.4; Steadfast/RedX stubs
// land in 13.4.
import type { CourierAdapter, CourierProvider } from '@ecommarce/types';

export const COURIER_ADAPTERS = Symbol('COURIER_ADAPTERS');

export interface CourierAdapterRegistry {
  get(provider: CourierProvider): CourierAdapter;
  all(): CourierAdapter[];
}

export type { CourierAdapter, CourierProvider };