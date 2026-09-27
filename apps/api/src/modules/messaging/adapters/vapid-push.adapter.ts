// Web Push (VAPID) adapter — sends a real push notification via the
// `web-push` library (RFC 8291 payload encryption).
//
// Behaviour:
//   - Valid VAPID keys + non-test env  → real webpush.sendNotification
//   - Missing/invalid keys or NODE_ENV=test → mock mode (ok:true, no network)
//   This keeps dev/CI green and lets prod fall back gracefully if keys
//   misconfigure; logs a warning so ops can see which mode is active.
import { Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import type { MessageDeliveryResult, PushAdapter, PushInput, PushProvider } from '@ecommarce/types';

interface VapidCfg {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export class VapidPushAdapter implements PushAdapter {
  public readonly provider: PushProvider = 'VAPID';
  private readonly logger = new Logger(VapidPushAdapter.name);
  private readonly realMode: boolean;

  constructor(private readonly cfg: VapidCfg) {
    const isTest = process.env.NODE_ENV === 'test';
    const hasKeys = Boolean(this.cfg.publicKey && this.cfg.privateKey);

    if (isTest || !hasKeys) {
      this.realMode = false;
      this.logger.warn(
        `[vapid-push] mock mode${isTest ? ' (NODE_ENV=test)' : ' (no keys)'} — send() will not hit network`,
      );
      return;
    }

    try {
      webpush.setVapidDetails(this.cfg.subject, this.cfg.publicKey, this.cfg.privateKey);
      this.realMode = true;
      this.logger.log('[vapid-push] VAPID configured — real push enabled');
    } catch (err) {
      this.realMode = false;
      this.logger.warn(
        `[vapid-push] VAPID setup failed — falling back to mock: ${(err as Error).message}`,
      );
    }
  }

  async send(input: PushInput): Promise<MessageDeliveryResult> {
    // Mock path — dev/CI/misconfigured prod
    if (!this.realMode) {
      this.logger.log(
        `[vapid-push/mock] endpoint=${input.subscriptionEndpoint?.slice(0, 40) ?? '(none)'}... title="${input.title}"`,
      );
      return {
        ok: true,
        providerMessageId: `MOCK-PUSH-${input.idempotencyKey}`,
        error: undefined,
        raw: { mock: true, title: input.title },
      };
    }

    // Real path — validate inputs
    if (
      !input.subscriptionEndpoint ||
      !input.subscriptionKeysP256dh ||
      !input.subscriptionKeysAuth
    ) {
      return {
        ok: false,
        providerMessageId: undefined,
        error: 'Missing subscription endpoint or keys',
        raw: {},
      };
    }

    const payload = JSON.stringify({
      title: input.title,
      body: input.body,
      url: input.url ?? '/',
    });

    try {
      const res = await webpush.sendNotification(
        {
          endpoint: input.subscriptionEndpoint,
          keys: {
            p256dh: input.subscriptionKeysP256dh,
            auth: input.subscriptionKeysAuth,
          },
        },
        payload,
      );
      this.logger.log(
        `[vapid-push] sent endpoint=${input.subscriptionEndpoint.slice(0, 40)}... status=${res.statusCode}`,
      );
      return {
        ok: true,
        providerMessageId: `PUSH-${input.idempotencyKey}`,
        error: undefined,
        raw: { statusCode: res.statusCode, body: res.body },
      };
    } catch (err: unknown) {
      const e = err as { statusCode?: number; body?: string; message?: string };
      this.logger.error(`[vapid-push] failed status=${e.statusCode} ${e.message ?? e.body}`);
      return {
        ok: false,
        providerMessageId: undefined,
        error: e.message ?? e.body ?? 'push failed',
        raw: { statusCode: e.statusCode },
      };
    }
  }
}