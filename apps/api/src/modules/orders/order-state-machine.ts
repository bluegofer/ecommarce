// apps/api/src/modules/orders/order-state-machine.ts
// Strict order lifecycle. Every legal transition listed here; anything else
// throws. The transition runner (in orders.service) executes side effects in
// one Prisma transaction so no half-updated order can exist (TDD §6.6, §11).
//
// Manual delivery statuses (TDD Appendix A §A.4) allow staff to move an
// order through IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED (or FAILED),
// independently of the courier integration. From FAILED, retry is allowed.
import { BadRequestException } from '@nestjs/common';
import type { OrderStatus } from '@ecommarce/types';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ['PENDING_VERIFICATION', 'CANCELLED'],
  PENDING_VERIFICATION: ['VERIFIED', 'CANCELLED'],
  VERIFIED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
  DELIVERED: ['RETURN_REQUESTED'],
  FAILED: ['SHIPPED', 'CANCELLED'],
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
    case 'PLACED':
      return 1;
    case 'PENDING_VERIFICATION':
    case 'VERIFIED':
    case 'CONFIRMED':
    case 'PROCESSING':
      return 2;
    case 'SHIPPED':
    case 'IN_TRANSIT':
      return 3;
    case 'OUT_FOR_DELIVERY':
      return 4;
    case 'DELIVERED':
      return 5;
    case 'FAILED':
    case 'CANCELLED':
      return 0;
    case 'RETURN_REQUESTED':
    case 'RETURNED':
      return 6;
    default:
      return 0;
  }
}