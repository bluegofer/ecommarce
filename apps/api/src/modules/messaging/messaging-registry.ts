// Registry for messaging adapters — one per channel type.
import { Injectable } from '@nestjs/common';
import type { EmailAdapter, PushAdapter, SmsAdapter } from '@ecommarce/types';

@Injectable()
export class MessagingRegistry {
  constructor(
    public readonly sms: SmsAdapter,
    public readonly email: EmailAdapter,
    public readonly push: PushAdapter,
  ) {}
}