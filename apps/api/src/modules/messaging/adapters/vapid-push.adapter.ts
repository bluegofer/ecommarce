// Web Push (VAPID) adapter — sends a real push notification via the
// `web-push` library (RFC 8291 payload encryption).
//
// Enabled when VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY are set in env
// (factory in messaging.module.ts wires it). Falls back to mock when
// keys are missing — dev/CI never crashes.
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
  private readonly configured: boolean;

  constructor(private readonly cfg: VapidCfg) {
    if (this.cfg.publicKey && this.cfg.privateKey) {
      try {
        webpush.setVapidDetails(this.cfg.subject, this.cfg.publicKey, this.cfg.privateKey);
        this.configured = true;
        this.logger.log('[vapid-push] VAPID configured — real push enabled');
      } catch (err) {
        this.configured = false;
        this.logger.error(`[vapid-push] VAPID setup failed: ${(err as Error).message}`);
      }
    } else {
      this.configured = false;
      this.logger.warn('[vapid-push] VAPID keys missing — send() will return mock');
    }
  }

  async send(input: PushInput): Promise<MessageDeliveryResult> {
    if (!this.configured) {
      return {
        ok: false,
        providerMessageId: undefined,
        error: 'VAPID keys not configured',
        raw: {},
      };
    }

    if (!input.subscriptionEndpoint || !input.subscriptionKeysP256dh || !input.subscriptionKeysAuth) {
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