/**
 * SMS / Email / Web Push contracts. Step 13.5 wires the real providers.
 * The mock SMS adapter lands in Step 13.1 behind the same interface.
 */

export type SmsProvider = 'MOCK' | 'SMSNETBD' | 'BULK_SMS_BD' | 'ALPHA_SMS' | 'BANGLA_SMS' | 'SSL_WIRELESS';
export type EmailProvider = 'SES' | 'MOCK';
export type PushProvider = 'VAPID' | 'MOCK';

export interface SmsInput {
  /** E.164 without leading + (e.g. 8801700000000). */
  to: string;
  body: string;
  senderId: string | undefined;
  idempotencyKey: string;
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  contentBase64: string;
}

export interface EmailInput {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string | undefined;
  attachments: EmailAttachment[];
  idempotencyKey: string;
}

export interface PushInput {
  subscriptionEndpoint: string;
  subscriptionKeysP256dh: string;
  subscriptionKeysAuth: string;
  title: string;
  body: string;
  url: string | undefined;
  idempotencyKey: string;
}

export interface MessageDeliveryResult {
  ok: boolean;
  providerMessageId: string | undefined;
  error: string | undefined;
  raw: Record<string, unknown>;
}

export interface SmsAdapter {
  readonly provider: SmsProvider;
  send(input: SmsInput): Promise<MessageDeliveryResult>;
}

export interface EmailAdapter {
  readonly provider: EmailProvider;
  send(input: EmailInput): Promise<MessageDeliveryResult>;
}

export interface PushAdapter {
  readonly provider: PushProvider;
  send(input: PushInput): Promise<MessageDeliveryResult>;
}