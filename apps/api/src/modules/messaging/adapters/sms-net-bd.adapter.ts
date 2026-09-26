// SMS.net.bd (Alpha SMS) adapter — Bangladesh OTP + transactional SMS.
//
// API docs: https://portal.sms.net.bd/api
// Endpoint:  https://api.sms.net.bd/sendsms
// Auth:      api_key query parameter
//
// Non-Masking rate: BDT 0.40/SMS. The service-level SMS footer (configured
// in the SMS.net.bd dashboard) appends the brand name automatically.
import { Logger } from '@nestjs/common';
import type {
  MessageDeliveryResult,
  SmsAdapter,
  SmsInput,
  SmsProvider,
} from '@ecommarce/types';

export interface SmsNetBdConfig {
  apiKey: string;
  /** Approved sender ID. Omit for Non-Masking. */
  senderId?: string;
  /** Override for local testing / proxies. */
  baseUrl?: string;
}

interface SmsNetBdSendResponse {
  error: number;
  msg: string;
  data?: { request_id: number | string };
}

export class SmsNetBdAdapter implements SmsAdapter {
  public readonly provider: SmsProvider = 'SMSNETBD';
  private readonly logger = new Logger(SmsNetBdAdapter.name);
  private readonly baseUrl: string;

  constructor(private readonly config: SmsNetBdConfig) {
    this.baseUrl = config.baseUrl ?? 'https://api.sms.net.bd';
  }

  async send(input: SmsInput): Promise<MessageDeliveryResult> {
    const params = new URLSearchParams({
      api_key: this.config.apiKey,
      msg: input.body,
      to: input.to,
    });
    const sender = input.senderId ?? this.config.senderId;
    if (sender && sender.trim().length > 0) {
      params.set('sender_id', sender);
    }

    const url = `${this.baseUrl}/sendsms`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const json = (await res.json()) as SmsNetBdSendResponse;

      if (json.error !== 0 || !json.data?.request_id) {
        this.logger.warn(
          `[smsnetbd] send failed error=${json.error} msg=${json.msg}`,
        );
        return {
          ok: false,
          providerMessageId: undefined,
          error: `SMS.net.bd error ${json.error}: ${json.msg}`,
          raw: json as unknown as Record<string, unknown>,
        };
      }

      const requestId = String(json.data.request_id);
      this.logger.log(
        `[smsnetbd] to=${input.to} len=${input.body.length} request_id=${requestId}`,
      );

      return {
        ok: true,
        providerMessageId: requestId,
        error: undefined,
        raw: json as unknown as Record<string, unknown>,
      };
    } catch (err) {
      this.logger.error(`[smsnetbd] network error: ${(err as Error).message}`);
      return {
        ok: false,
        providerMessageId: undefined,
        error: (err as Error).message,
        raw: {},
      };
    }
  }
}