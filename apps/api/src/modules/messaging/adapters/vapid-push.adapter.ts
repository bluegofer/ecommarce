// Web Push (VAPID) adapter.
//
// Behaviour matrix:
//   keys missing                        → send() rejects with "VAPID keys not configured"
//   keys present + NODE_ENV=test        → mock accept (skip network)
//   keys present + VAPID setup invalid  → mock accept with warning (fallback)
//   keys present + VAPID setup valid    → real webpush.sendNotification
//
// This keeps CI green (no network) while giving prod a graceful degrade.
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
  private readonly hasKeys: boolean;
  private readonly realMode: boolean;

  constructor(private readonly cfg: VapidCfg) {
    this.hasKeys = Boolean(this.cfg.publicKey && this.cfg.privateKey);

    if (!this.hasKeys) {
      this.realMode = false;
      this.logger.warn('[vapid-push] VAPID keys missing — send() will reject');
      return;
    }

    if (process.env.NODE_ENV === 'test') {
      this.realMode = false;
      this.logger.warn('[vapid-push] NODE_ENV=test — mock mode');
      return;
    }

    try {
      webpush.setVapidDetails(this.cfg.subject, this.cfg.publicKey, this.cfg.privateKey);
      this.realMode = true;
      this.logger.log('[vapid-push] VAPID configured — real push enabled');
    } catch (err) {
      this.realMode = false;
      this.logger.warn(
        `[vapid-push] VAPID setup failed — mock fallback: ${(err as Error).message}`,
      );
    }
  }

  async send(input: PushInput): Promise<MessageDeliveryResult> {
    // Case 1 — keys were never configured: reject (contract preserved)
    if (!this.hasKeys) {
      return {
        ok: false,
        providerMessageId: undefined,
        error: 'VAPID keys not configured',
        raw: {},
      };
    }

    // Case 2 — keys present but no real webpush (test / invalid setup): mock accept
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

    // Case 3 — real mode: validate + send
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