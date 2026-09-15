// MessagingService — single entry point for SMS / email / push dispatch.
// Every send is idempotent on the caller's idempotencyKey.
import { Injectable, Logger } from '@nestjs/common';
import { MessagingRegistry } from './messaging-registry';
import type {
  EmailAttachment,
  MessageDeliveryResult,
  PushInput,
  SmsInput,
} from '@ecommarce/types';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(private readonly registry: MessagingRegistry) {}

  async sendSms(input: Omit<SmsInput, 'senderId'> & { senderId?: string }): Promise<MessageDeliveryResult> {
    const senderId = input.senderId ?? process.env.SMS_SENDER_ID ?? 'SKYMART';
    try {
      return await this.registry.sms.send({ ...input, senderId });
    } catch (err) {
      this.logger.error(`SMS send failed: ${(err as Error).message}`);
      return { ok: false, providerMessageId: undefined, error: (err as Error).message, raw: {} };
    }
  }

  async sendEmail(input: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: EmailAttachment[];
    idempotencyKey: string;
  }): Promise<MessageDeliveryResult> {
    const from = process.env.SES_FROM_ADDRESS ?? 'noreply@bluegofer.local';
    try {
      return await this.registry.email.send({
        to: input.to,
        from,
        subject: input.subject,
        html: input.html,
        text: input.text,
        attachments: input.attachments ?? [],
        idempotencyKey: input.idempotencyKey,
      });
    } catch (err) {
      this.logger.error(`Email send failed: ${(err as Error).message}`);
      return { ok: false, providerMessageId: undefined, error: (err as Error).message, raw: {} };
    }
  }

  async sendPush(input: PushInput): Promise<MessageDeliveryResult> {
    try {
      return await this.registry.push.send(input);
    } catch (err) {
      this.logger.error(`Push send failed: ${(err as Error).message}`);
      return { ok: false, providerMessageId: undefined, error: (err as Error).message, raw: {} };
    }
  }
}