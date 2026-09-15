// Mock SMS adapter — deterministic, no external call.
// Real providers (Bulk SMS BD / Alpha SMS / SSL Wireless) replace this in
// Step 15 when D-09 is decided; env-driven swap, no code change.
import { Logger } from '@nestjs/common';
import type { MessageDeliveryResult, SmsAdapter, SmsInput, SmsProvider } from '@ecommarce/types';

export class MockSmsAdapter implements SmsAdapter {
  public readonly provider: SmsProvider = 'MOCK';
  private readonly logger = new Logger(MockSmsAdapter.name);

  async send(input: SmsInput): Promise<MessageDeliveryResult> {
    this.logger.log(`[mock-sms] to=${input.to} len=${input.body.length}`);
    return {
      ok: true,
      providerMessageId: `MOCK-SMS-${input.idempotencyKey}`,
      error: undefined,
      raw: { mock: true, to: input.to, bodyLength: input.body.length },
    };
  }
}