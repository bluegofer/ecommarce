// COD adapter — no external gateway. Availability rules only (D-13 = no fee).
// Kept as a first-class adapter so the payment service treats COD identically
// to wallet flows; the difference is that the "gateway" is the courier's COD
// collection (Step 13.4 settlement tracking).
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

export class CodAdapter implements PaymentAdapter {
  public readonly provider: PaymentProvider = 'COD';
  private readonly logger = new Logger(CodAdapter.name);

  constructor(private readonly config: AppConfig) {}

  async initiate(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    if (
      this.config.codMaxOrderValuePoisha > 0 &&
      input.amountPoisha > this.config.codMaxOrderValuePoisha
    ) {
      throw new Error(
        `COD not available for orders above ${this.config.codMaxOrderValuePoisha / 100} BDT`,
      );
    }
    this.logger.log(`COD initiate order=${input.orderNumber} amount=${input.amountPoisha}`);
    return {
      provider: this.provider,
      providerIntentId: `COD-${input.orderNumber}`,
      redirectUrl: undefined,
      status: 'PENDING',
      rawResponse: {
        cod: true,
        handlingFeePoisha: this.config.codHandlingFeePoisha,
      },
    };
  }

  async verifyWebhook(input: WebhookVerifyInput): Promise<WebhookVerifyResult> {
    // COD has no gateway webhook — delivery confirmation arrives from courier
    // tracking (Step 13.4), which flips the payment to PAID.
    return { ok: false, reason: 'COD has no webhook', event: undefined };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    // COD refunds are processed manually (bank/MFS transfer) and recorded
    // here for audit; status remains PENDING until finance confirms.
    this.logger.warn(`COD refund recorded for manual processing: ${input.providerIntentId}`);
    return {
      ok: false,
      providerRefundId: undefined,
      status: 'PENDING',
      rawResponse: { note: 'COD refund processed manually by finance' },
    };
  }
}