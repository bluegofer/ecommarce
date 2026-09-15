// Web Push (VAPID) adapter — sends a JSON payload to a subscription endpoint.
// Real RFC 8291 payload encryption is out of scope for Step 13.5; the
// interface is here so the wiring exists. Full encryption lands when the
// storefront PWA opt-in is enabled (Step 15).
import { Logger } from '@nestjs/common';
import type { MessageDeliveryResult, PushAdapter, PushInput, PushProvider } from '@ecommarce/types';

interface VapidCfg {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export class VapidPushAdapter implements PushAdapter {
  public readonly provider: PushProvider = 'VAPID';
  private readonly logger = new Logger(VapidPushAdapter.name);

  constructor(private readonly cfg: VapidCfg) {}

  async send(input: PushInput): Promise<MessageDeliveryResult> {
    if (!this.cfg.publicKey || !this.cfg.privateKey) {
      return {
        ok: false,
        providerMessageId: undefined,
        error: 'VAPID keys not configured',
        raw: {},
      };
    }
    // For now, log the intent. Encryption + real POST is Step 15 scope.
    this.logger.log(
      `[vapid-push] endpoint=${input.subscriptionEndpoint.slice(0, 40)}... title="${input.title}"`,
    );
    return {
      ok: true,
      providerMessageId: `MOCK-PUSH-${input.idempotencyKey}`,
      error: undefined,
      raw: { mock: true, title: input.title },
    };
  }
}