// MessagingModule — env-driven factory:
//   SMS:   mock (real provider chosen in Step 15 when D-09 decided)
//   Email: SES when SES_* env present, else mock
//   Push:  VAPID when VAPID_* env present, else mock
import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { MessagingRegistry } from './messaging-registry';
import { MockSmsAdapter } from './adapters/mock-sms.adapter';
import { MockEmailAdapter } from './adapters/mock-email.adapter';
import { SesEmailAdapter } from './adapters/ses-email.adapter';
import { VapidPushAdapter } from './adapters/vapid-push.adapter';
import type { EmailAdapter, PushAdapter, SmsAdapter } from '@ecommarce/types';

function buildRegistry(): MessagingRegistry {
  const sms: SmsAdapter = new MockSmsAdapter();

  const sesRegion = process.env.SES_REGION ?? '';
  const sesAccessKey = process.env.SES_ACCESS_KEY_ID ?? '';
  const sesSecret = process.env.SES_SECRET_ACCESS_KEY ?? '';
  const sesFrom = process.env.SES_FROM_ADDRESS ?? '';
  const email: EmailAdapter =
    sesRegion && sesAccessKey && sesSecret
      ? new SesEmailAdapter({
          region: sesRegion,
          accessKeyId: sesAccessKey,
          secretAccessKey: sesSecret,
          fromAddress: sesFrom,
        })
      : new MockEmailAdapter();

  const push: PushAdapter = new VapidPushAdapter({
    publicKey: process.env.VAPID_PUBLIC_KEY ?? '',
    privateKey: process.env.VAPID_PRIVATE_KEY ?? '',
    subject: `mailto:${sesFrom || 'noreply@bluegofer.local'}`,
  });

  return new MessagingRegistry(sms, email, push);
}

@Module({
  providers: [
    {
      provide: MessagingRegistry,
      useFactory: buildRegistry,
    },
    MessagingService,
  ],
  exports: [MessagingService],
})
export class MessagingModule {}