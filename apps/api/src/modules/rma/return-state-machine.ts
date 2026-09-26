// apps/api/src/modules/rma/return-state-machine.ts
import { BadRequestException } from '@nestjs/common';
import type { ReturnStatus } from '@ecommarce/types';

const TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['PICKED_UP', 'REJECTED'],
  PICKED_UP: ['RECEIVED'],
  RECEIVED: ['RESOLVED'],
  REJECTED: [],
  RESOLVED: [],
};

export function assertReturnTransition(from: ReturnStatus, to: ReturnStatus): void {
  const allowed = TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(`Illegal return transition: ${from} → ${to}`);
  }
}