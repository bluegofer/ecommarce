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

export type TicketStatus = 'OPEN' | 'PENDING' | 'RESOLVED';

export interface ReturnRequestDto {
  id: string;
  orderId: string;
  customerId: string;
  status: ReturnStatus;
  reason: ReturnReason;
  reasonNote: string | null;
  photoUrls: string[] | null;
  itemIds: string[];
  refundAmountPoisha: number;
  refundedAt: string | null;
  restockedAt: string | null;
  rejectReason: string | null;
  trackingNumber: string | null;
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