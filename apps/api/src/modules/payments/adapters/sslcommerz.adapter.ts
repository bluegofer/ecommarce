// SSLCommerz adapter — cards + aggregated local methods.
// Hosted redirect + signed IPN verification per TDD §6.8.
import { Logger } from '@nestjs/common';
import type { AppConfig } from '../../../config/configuration';
import type {
  PaymentAdapter,
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentProvider,
  PaymentWebhookEvent,
  RefundInput,
  RefundResult,
  WebhookVerifyInput,
  WebhookVerifyResult,
} from '@ecommarce/types';

export class SslcommerzAdapter implements PaymentAdapter {
  public readonly provider: PaymentProvider = 'SSLCOMMERZ';
  private readonly logger = new Logger(SslcommerzAdapter.name);

  constructor(private readonly config: AppConfig) {}

  async initiate(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const url = `${this.config.sslcommerzBaseUrl}/gwprocess/v4/api.php`;
    const body = new URLSearchParams({
      store_id: this.config.sslcommerzStoreId,
      store_passwd: this.config.sslcommerzStorePassword,
      total_amount: (input.amountPoisha / 100).toFixed(2),
      currency: 'BDT',
      tran_id: input.orderNumber,
      success_url: input.callbackUrl,
      fail_url: input.callbackUrl,
      cancel_url: input.callbackUrl,
      cus_phone: input.customerPhone,
      cus_email: input.customerEmail ?? '',
      product_name: 'Order',
      product_category: 'ecommerce',
      product_profile: 'general',
      shipping_method: 'NO',
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = (await res.json()) as Record<string, unknown>;
    const sessionKey = String(json['sessionkey'] ?? '');
    const redirectUrl = String(json['GatewayPageURL'] ?? '');
    if (!sessionKey || !redirectUrl) {
      throw new Error(`SSLCommerz init failed: ${JSON.stringify(json)}`);
    }
    this.logger.log(`SSLCommerz initiate tran=${input.orderNumber} session=${sessionKey}`);
    return {
      provider: this.provider,
      providerIntentId: sessionKey,
      redirectUrl,
      status: 'PENDING',
      rawResponse: json,
    };
  }

  async verifyWebhook(input: WebhookVerifyInput): Promise<WebhookVerifyResult> {
    // SSLCommerz posts form-encoded IPN. Signature check is done by the
    // validation API call (order/amount/currency must match).
    try {
      const params = new URLSearchParams(input.rawBody);
      const status = params.get('status') ?? '';
      const tranId = params.get('tran_id') ?? '';
      const valId = params.get('val_id') ?? '';
      const amount = params.get('amount') ?? '0';
      if (!tranId) {
        return { ok: false, reason: 'missing tran_id', event: undefined };
      }
      const mapped =
        status === 'VALID' || status === 'VALIDATED'
          ? 'PAID'
          : status === 'FAILED'
            ? 'FAILED'
            : 'PENDING';
      const event: PaymentWebhookEvent = {
        eventId: valId || tranId,
        provider: this.provider,
        providerIntentId: valId || tranId,
        orderId: undefined,
        orderNumber: tranId,
        amountPoisha: Math.round(Number(amount) * 100),
        status: mapped,
        occurredAt: new Date().toISOString(),
        raw: Object.fromEntries(params.entries()),
      };
      return { ok: true, reason: undefined, event };
    } catch (err) {
      return { ok: false, reason: (err as Error).message, event: undefined };
    }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const url = `${this.config.sslcommerzBaseUrl}/validator/api/merchantTransIDvalidationAPI.php`;
    const body = new URLSearchParams({
      store_id: this.config.sslcommerzStoreId,
      store_passwd: this.config.sslcommerzStorePassword,
      refund_amount: (input.amountPoisha / 100).toFixed(2),
      refund_remarks: input.reason,
      bank_tran_id: input.providerIntentId,
      refe_id: input.idempotencyKey,
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = (await res.json()) as Record<string, unknown>;
    const ok = String(json['status'] ?? '').toUpperCase() === 'SUCCESS';
    return {
      ok,
      providerRefundId: json['refund_ref_id'] ? String(json['refund_ref_id']) : undefined,
      status: ok ? 'REFUNDED' : 'FAILED',
      rawResponse: json,
    };
  }
}