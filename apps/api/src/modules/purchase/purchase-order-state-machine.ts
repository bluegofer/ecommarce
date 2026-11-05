// apps/api/src/modules/purchase/purchase-order-state-machine.ts
import { BadRequestException } from '@nestjs/common';

export type ReqStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CONVERTED';
export type PoStatus = 'DRAFT' | 'SENT' | 'PARTIAL_RECEIVED' | 'RECEIVED' | 'CLOSED' | 'CANCELLED';
export type InvStatus = 'DRAFT' | 'POSTED' | 'PARTIAL_PAID' | 'PAID' | 'VOID';
export type GrnStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

const REQ_TRANSITIONS: Record<ReqStatus, ReqStatus[]> = {
  DRAFT: ['SUBMITTED', 'REJECTED'],
  SUBMITTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['CONVERTED'],
  REJECTED: [],
  CONVERTED: [],
};

const PO_TRANSITIONS: Record<PoStatus, PoStatus[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['PARTIAL_RECEIVED', 'RECEIVED', 'CANCELLED', 'CLOSED'],
  PARTIAL_RECEIVED: ['RECEIVED', 'CLOSED'],
  RECEIVED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

const INV_TRANSITIONS: Record<InvStatus, InvStatus[]> = {
  DRAFT: ['POSTED', 'VOID'],
  POSTED: ['PARTIAL_PAID', 'PAID', 'VOID'],
  PARTIAL_PAID: ['PAID', 'VOID'],
  PAID: [],
  VOID: [],
};

const GRN_TRANSITIONS: Record<GrnStatus, GrnStatus[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: [],
  CANCELLED: [],
};

export function assertReqTransition(from: ReqStatus, to: ReqStatus): void {
  if (!REQ_TRANSITIONS[from]?.includes(to)) {
    throw new BadRequestException('Illegal requisition transition: ' + from + ' -> ' + to);
  }
}
export function assertPoTransition(from: PoStatus, to: PoStatus): void {
  if (!PO_TRANSITIONS[from]?.includes(to)) {
    throw new BadRequestException('Illegal purchase order transition: ' + from + ' -> ' + to);
  }
}
export function assertInvTransition(from: InvStatus, to: InvStatus): void {
  if (!INV_TRANSITIONS[from]?.includes(to)) {
    throw new BadRequestException('Illegal purchase invoice transition: ' + from + ' -> ' + to);
  }
}
export function assertGrnTransition(from: GrnStatus, to: GrnStatus): void {
  if (!GRN_TRANSITIONS[from]?.includes(to)) {
    throw new BadRequestException('Illegal GRN transition: ' + from + ' -> ' + to);
  }
}