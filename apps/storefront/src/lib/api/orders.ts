import { api } from './client';

// ── Types (mirror apps/api/modules/orders/me-orders.service.ts) ──

export interface MyOrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  totalPoisha: number;
  subtotalPoisha: number;
  discountPoisha: number;
  deliveryChargePoisha: number;
  placedAt: string;
  itemCount: number;
  firstItem: { title: string; imageUrl: string | null } | null;
}

export interface MyOrderItem {
  id: string;
  variantId: string;
  titleEn: string;
  titleBn: string;
  variantSnapshot: unknown;
  unitPricePoisha: number;
  quantity: number;
  lineTotalPoisha: number;
  imageUrl: string | null;
}

export interface MyOrderStatusEvent {
  fromStatus: string | null;
  toStatus: string;
  createdAt: string;
  note: string | null;
}

export interface MyOrderDetail extends MyOrderListItem {
  shippingAddressJson: unknown;
  contactPhone: string;
  contactEmail: string | null;
  customerNote: string | null;
  cancelReason: string | null;
  trackingNumber: string | null;
  courierName: string | null;
  items: MyOrderItem[];
  statusHistory: MyOrderStatusEvent[];
}

// ── API wrapper ──

export const ordersApi = {
  listMine: () => api.get<MyOrderListItem[]>('/me/orders'),

  findMine: (id: string) => api.get<MyOrderDetail>(`/me/orders/${id}`),

  /**
   * Fetch the invoice PDF as a Blob (T2-4).
   * Ownership enforced server-side at GET /me/orders/:id/invoice.pdf.
   * Caller triggers the browser download via URL.createObjectURL.
   */
  downloadInvoice: async (id: string): Promise<Blob> => {
    const res = await api.get<Response>(`/me/orders/${id}/invoice.pdf`, {
      raw: true,
    });
    return res.blob();
  },
};