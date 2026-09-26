import { api } from './client';

// ── Types (mirror apps/api/modules/rma/returns.service.ts) ──

export interface MyReturnItem {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  reason: string;
  note: string | null;
  refundAmountPoisha: number;
  requestedAt: string;
  resolvedAt: string | null;
}

// ── API wrapper ──

export const returnsApi = {
  listMine: () => api.get<MyReturnItem[]>('/returns/me'),
};