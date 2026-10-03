// bKash tokenized checkout adapter (TDD §6.8).
// Real HTTP calls to bKash sandbox/production endpoints per env config.
// Only ever touches a gateway-hosted URL — no raw wallet credentials on our
// servers (TDD §10.5).
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

interface BkashTokenResponse {
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  statusCode?: string;
  statusMessage?: string;
}

interface BkashCreateResponse {
  paymentID?: string;
  bkashURL?: string;
  statusCode?: string;
  statusMessage?: string;
}

export class BkashAdapter implements PaymentAdapter {
  public readonly provider: PaymentProvider = 'BKASH';
  private readonly logger = new Logger(BkashAdapter.name);
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(private readonly config: AppConfig) {}

  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 30_000) {
      return this.tokenCache.token;
    }
    const url = `${this.config.bkashBaseUrl}/tokenized/checkout/token/grant`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        username: this.config.bkashUsername,
        password: this.config.bkashPassword,
      },
      body: JSON.stringify({
        app_key: this.config.bkashAppKey,
        app_secret: this.config.bkashAppSecret,
      }),
    });
    const json = (await res.json()) as BkashTokenResponse;
    if (!json.id_token) {
      throw new Error(
        `bKash token grant failed: ${json.statusCode ?? res.status} ${json.statusMessage ?? ''}`,
      );
    }
    const ttlSec = json.expires_in ?? 3600;
    this.tokenCache = { token: json.id_token, expiresAt: now + ttlSec * 1000 };
    return json.id_token;
  }

  async initiate(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const token = await this.getToken();
    const url = `${this.config.bkashBaseUrl}/tokenized/checkout/create`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: token,
        'X-APP-Key': this.config.bkashAppKey,
      },
      body: JSON.stringify({
        mode: '0011',
        payerReference: input.customerPhone,
        callbackURL: input.callbackUrl,
        amount: (input.amountPoisha / 100).toFixed(2),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: input.orderNumber,
      }),
    });
    const json = (await res.json()) as BkashCreateResponse;
    if (!json.paymentID || !json.bkashURL) {
      throw new Error(
        `bKash create failed: ${json.statusCode ?? res.status} ${json.statusMessage ?? ''}`,
      );
    }
    this.logger.log(`bKash initiate order=${input.orderNumber} paymentID=${json.paymentID}`);
    return {
      provider: this.provider,
      providerIntentId: json.paymentID,
      redirectUrl: json.bkashURL,
      status: 'PENDING',
      rawResponse: json as unknown as Record<string, unknown>,
    };
  }

  async verifyWebhook(input: WebhookVerifyInput): Promise<WebhookVerifyResult> {
    // bKash does not use HMAC on webhook; verification is a follow-up
    // execute-payment call with the paymentID from the payload. We parse and
    // return the event; the caller (service) does the execute call.
    try {
      const parsed = JSON.parse(input.rawBody) as Record<string, unknown>;
      const paymentId = String(parsed['paymentID'] ?? parsed['paymentId'] ?? '');
      const trxStatus = String(parsed['transactionStatus'] ?? parsed['status'] ?? '');
      if (!paymentId) {
        return { ok: false, reason: 'missing paymentID', event: undefined };
      }
      const status =
        trxStatus === 'Completed'
          ? 'PAID'
          : trxStatus === 'Cancelled'
            ? 'FAILED'
            : 'PENDING';
      const event: PaymentWebhookEvent = {
        eventId: paymentId,
        provider: this.provider,
        providerIntentId: paymentId,
        orderId: parsed['orderId'] ? String(parsed['orderId']) : undefined,
        orderNumber: parsed['merchantInvoiceNumber']
          ? String(parsed['merchantInvoiceNumber'])
          : undefined,
        amountPoisha: Math.round(Number(parsed['amount'] ?? 0) * 100),
        status,
        occurredAt: new Date().toISOString(),
        raw: parsed,
      };
      return { ok: true, reason: undefined, event };
    } catch (err) {
      return { ok: false, reason: (err as Error).message, event: undefined };
    }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const token = await this.getToken();
    const url = `${this.config.bkashBaseUrl}/tokenized/checkout/payment/refund`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: token,
        'X-APP-Key': this.config.bkashAppKey,
      },
      body: JSON.stringify({
        paymentID: input.providerIntentId,
        amount: (input.amountPoisha / 100).toFixed(2),
        trxID: input.idempotencyKey,
        sku: 'refund',
        reason: input.reason,
      }),
    });
    const json = (await res.json()) as Record<string, unknown>;
    const ok = String(json['statusCode'] ?? '') === '0000';
    return {
      ok,
      providerRefundId: json['refundTrxID'] ? String(json['refundTrxID']) : undefined,
      status: ok ? 'REFUNDED' : 'FAILED',
      rawResponse: json,
    };
  }
}