// apps/storefront/src/lib/api/returns.ts
// M-2/M-3/M-4 — customer-facing return request APIs.
// Preserves existing MyReturnItem + listMine (used by ReturnsList component).
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

export interface ReturnLineItem {
  id: string;
  sku: string;
  title: string;
  quantity: number;
}

export interface ReturnRequestSummary {
  id: string;
  orderId: string;
  orderNumber: string;
  status: 'REQUESTED' | 'APPROVED' | 'PICKED_UP' | 'RECEIVED' | 'RESOLVED' | 'REJECTED';
  reason: string;
  reasonNote: string | null;
  photoUrls: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnEvent {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  actorUserId: string | null;
  createdAt: string;
}

export interface ReturnRequestDetail extends ReturnRequestSummary {
  itemIds: string[];
  items: ReturnLineItem[] | null;
  history?: ReturnEvent[];
  timeline: ReturnEvent[];
}

export interface CreateReturnPayload {
  orderId: string;
  itemIds: string[];
  reason: string;
  reasonNote?: string;
  photoUrls?: string[];
}

// ── API wrapper ──

export const returnsApi = {
  listMine(): Promise<MyReturnItem[]> {
    return api.get<MyReturnItem[]>('/returns/me');
  },
  async create(payload: CreateReturnPayload): Promise<ReturnRequestDetail> {
    const data = await api.post<ReturnRequestDetail & { history?: ReturnEvent[] }>('/returns', payload);
    return {
      ...data,
      timeline: data.history ?? data.timeline ?? [],
    };
  },
  async detail(id: string): Promise<ReturnRequestDetail> {
    const data = await api.get<ReturnRequestDetail & { history?: ReturnEvent[] }>(`/returns/${id}`);
    return {
      ...data,
      timeline: data.history ?? data.timeline ?? [],
    };
  },
};
