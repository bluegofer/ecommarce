// Mock email adapter — logs to console; used when SES_* env is absent.
import { Logger } from '@nestjs/common';
import type { EmailAdapter, EmailInput, EmailProvider, MessageDeliveryResult } from '@ecommarce/types';

export class MockEmailAdapter implements EmailAdapter {
  public readonly provider: EmailProvider = 'MOCK';
  private readonly logger = new Logger(MockEmailAdapter.name);

  async send(input: EmailInput): Promise<MessageDeliveryResult> {
    this.logger.log(
      `[mock-email] to=${input.to} subject="${input.subject}" attachments=${input.attachments.length}`,
    );
    return {
      ok: true,
      providerMessageId: `MOCK-EMAIL-${input.idempotencyKey}`,
      error: undefined,
      raw: { mock: true, to: input.to, subject: input.subject },
    };
  }
}