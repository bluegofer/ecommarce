// Storefront payment client — wraps POST /payments/initiate.
// Returns either { redirectUrl } (wallet/card) or { status: PENDING } (COD).
import { api } from './client';

export interface PaymentInitiateInput {
  orderId: string;
  provider: 'BKASH' | 'NAGAD' | 'SSLCOMMERZ' | 'COD';
  callbackUrl: string;
}

export interface PaymentInitiateResult {
  provider: string;
  providerIntentId: string;
  redirectUrl?: string;
  status: string;
  rawResponse?: Record<string, unknown>;
}

export const paymentsApi = {
  async initiate(
    input: PaymentInitiateInput,
    idempotencyKey: string,
  ): Promise<PaymentInitiateResult> {
    const res = await api.post<{ ok: boolean; result: PaymentInitiateResult }>(
      '/payments/initiate',
      input,
      { idempotencyKey },
    );
    return res.result;
  },
};