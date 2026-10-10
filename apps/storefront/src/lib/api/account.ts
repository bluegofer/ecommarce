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
  hasPassword: boolean;
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

export interface ChangePhoneInput {
  /** New phone in E.164 format (e.g. +8801712345678). */
  newPhone: string;
  /** 6-digit OTP delivered to `newPhone`. */
  otp: string;
}

export interface VerifyCurrentPhoneInput {
  /** 6-digit OTP delivered to the user's current phone. */
  otp: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

// ── API wrapper ──

export const accountApi = {
  getProfile: () => api.get<MeProfile>('/me'),

  updateProfile: (input: UpdateProfileInput) =>
    api.patch<MeProfile>('/me', input),

  /**
   * Change phone with OTP verification.
   * Precondition: caller must have first requested an OTP for `newPhone`
   * via POST /auth/otp/request.
   * Response: updated MeProfile with phoneVerified=true.
   */
  changePhone: (input: ChangePhoneInput) =>
    api.post<MeProfile>('/me/phone/change', input),

  /**
   * Verify the currently-held phone.
   * Precondition: caller must have first requested an OTP for their
   * current phone via POST /auth/otp/request.
   */
  verifyCurrentPhone: (input: VerifyCurrentPhoneInput) =>
    api.post<MeProfile>('/me/phone/verify', input),

  /**
   * Change password (requires current password).
   * On success: all refresh tokens revoked (user must re-login on
   * other devices).
   */
  changePassword: (input: ChangePasswordInput) =>
    api.post<{ ok: true }>('/auth/change-password', input),

  listAddresses: () => api.get<MeAddress[]>('/me/addresses'),

  createAddress: (input: UpsertAddressInput) =>
    api.post<MeAddress>('/me/addresses', input),

  updateAddress: (id: string, input: UpsertAddressInput) =>
    api.patch<MeAddress>(`/me/addresses/${id}`, input),

  deleteAddress: (id: string) =>
    api.del<{ ok: true }>(`/me/addresses/${id}`),
};