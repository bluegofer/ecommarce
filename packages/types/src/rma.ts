// packages/types/src/rma.ts
// Return Merchandise Authorization + Support tickets.

export type ReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PICKED_UP'
  | 'RECEIVED'
  | 'RESOLVED';

export type ReturnReason =
  | 'DAMAGED'
  | 'WRONG_ITEM'
  | 'NOT_AS_DESCRIBED'
  | 'CHANGED_MIND'
  | 'SIZE_ISSUE'
  | 'QUALITY_ISSUE'
  | 'OTHER';

export type RefundMethod =
  | 'BKASH'
  | 'NAGAD'
  | 'ROCKET'
  | 'BANK_TRANSFER'
  | 'PROMO_CODE'
  | 'STORE_CREDIT';

export type ReturnResolutionType = 'REFUND' | 'REPLACEMENT';

export type PickupMethod = 'HOME_PICKUP' | 'SELF_DROP_OFF';

export type TicketStatus = 'OPEN' | 'PENDING' | 'RESOLVED';

export interface ReturnRequestDto {
  id: string;
  orderId: string;
  orderNumber: string | null;
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
  status: ReturnStatus;
  reason: ReturnReason;
  reasonNote: string | null;
  photoUrls: string[] | null;
  itemIds: string[];
  items: Array<{ id: string; sku: string; title: string; quantity: number }> | null;
  refundAmountPoisha: number;
  refundMethod: RefundMethod | null;
  refundReference: string | null;
  refundedAt: string | null;
  restockedAt: string | null;
  rejectReason: string | null;
  trackingNumber: string | null;
  resolutionType: ReturnResolutionType | null;
  pickupMethod: PickupMethod | null;
  replacementVariantId: string | null;
  replacementNotes: string | null;
  createdAt: string;
  updatedAt: string;
  history?: ReturnStatusHistoryDto[];
}

export interface ReturnStatusHistoryDto {
  id: string;
  returnRequestId: string;
  fromStatus: ReturnStatus | null;
  toStatus: ReturnStatus;
  actorUserId: string | null;
  note: string | null;
  createdAt: string;
}

export interface CreateReturnRequestDto {
  orderId: string;
  itemIds: string[];
  reason: ReturnReason;
  reasonNote?: string;
  photoUrls?: string[];
}

export interface ApproveReturnDto {
  refundAmountPoisha: number;
  refundMethod: RefundMethod;
  refundReference?: string;
  note?: string;
}

export interface RejectReturnDto {
  rejectReason: string;
}

export interface MarkReturnPickedUpDto {
  trackingNumber?: string;
}

export interface SupportTicketDto {
  id: string;
  ticketNumber: string;
  customerId: string | null;
  orderId: string | null;
  subject: string;
  status: TicketStatus;
  priority: number;
  lastMessageAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessageDto[];
}

export interface TicketMessageDto {
  id: string;
  ticketId: string;
  fromStaff: boolean;
  actorUserId: string | null;
  body: string;
  createdAt: string;
}

export interface CreateTicketDto {
  subject: string;
  body: string;
  customerId?: string;
  orderId?: string;
  priority?: number;
}

export interface ReplyTicketDto {
  body: string;
  fromStaff: boolean;
}

export interface ResolveReturnDto {
  resolutionType: ReturnResolutionType;
  refundMethod?: RefundMethod;
  refundReference?: string;
  refundAmountPoisha?: number;
  replacementVariantId?: string;
  replacementNotes?: string;
  note?: string;
}
