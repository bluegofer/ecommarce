import { api } from './client';

// ── Types (mirror apps/api/modules/crm/me.service.ts) ──

export interface MeProfile {
  userId: string;
  customerId: string | null;
  phone: string;
  email: string | null;
  fullName: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  totalOrders: number;
  totalSpentPoisha: number;
}

export interface MeAddress {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  area: string;
  city: string;
  postcode: string | null;
  line1: string;
  line2: string | null;
  isDefault: boolean;
}

export interface UpsertAddressInput {
  label?: string;
  recipientName: string;
  phone: string;
  area: string;
  city: string;
  postcode?: string;
  line1: string;
  line2?: string;
  isDefault?: boolean;
}

export interface UpdateProfileInput {
  fullName?: string;
  email?: string | null;
}

// ── API wrapper ──

export const accountApi = {
  getProfile: () => api.get<MeProfile>('/me'),

  updateProfile: (input: UpdateProfileInput) =>
    api.patch<MeProfile>('/me', input),

  listAddresses: () => api.get<MeAddress[]>('/me/addresses'),

  createAddress: (input: UpsertAddressInput) =>
    api.post<MeAddress>('/me/addresses', input),

  updateAddress: (id: string, input: UpsertAddressInput) =>
    api.patch<MeAddress>(`/me/addresses/${id}`, input),

  deleteAddress: (id: string) =>
    api.del<{ ok: true }>(`/me/addresses/${id}`),
};