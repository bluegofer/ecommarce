// apps/api/src/modules/orders/order-state-machine.ts
// Strict order lifecycle. Every legal transition listed here; anything else
// throws. The transition runner (in orders.service) executes side effects in
// one Prisma transaction so no half-updated order can exist (TDD §6.6, §11).
import { BadRequestException } from '@nestjs/common';
import type { OrderStatus } from '@ecommarce/types';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED'],
  RETURNED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new BadRequestException(`Illegal order transition: ${from} → ${to}`);
  }
}

/**
 * Human-readable status used by the customer tracking timeline
 * (matches UI Spec C9 — 5 nodes).
 */
export function trackingNodeFor(status: OrderStatus): number {
  switch (status) {
    case 'PLACED': return 1;
    case 'CONFIRMED': return 2;
    case 'PROCESSING': return 2;
    case 'SHIPPED': return 3;
    case 'DELIVERED': return 4;
    case 'CANCELLED': return 0;
    case 'RETURN_REQUESTED':
    case 'RETURNED': return 5;
    default: return 0;
  }
}