// Step 13.7 — Messaging adapters smoke test (TDD §6.11).
import { MockSmsAdapter } from '../../src/modules/messaging/adapters/mock-sms.adapter';
import { MockEmailAdapter } from '../../src/modules/messaging/adapters/mock-email.adapter';
import { VapidPushAdapter } from '../../src/modules/messaging/adapters/vapid-push.adapter';

describe('Messaging — adapter smoke', () => {
  describe('MockSmsAdapter', () => {
    const adapter = new MockSmsAdapter();

    it('returns ok with a deterministic message ID', async () => {
      const r = await adapter.send({
        to: '+8801700000000',
        body: 'test',
        senderId: 'SKYMART',
        idempotencyKey: 'test-key-1',
      });
      expect(r.ok).toBe(true);
      expect(r.providerMessageId).toBe('MOCK-SMS-test-key-1');
    });

    it('handles Bangla body', async () => {
      const r = await adapter.send({
        to: '+8801700000000',
        body: 'আপনার অর্ডার নিশ্চিত হয়েছে',
        senderId: 'SKYMART',
        idempotencyKey: 'test-key-bn',
      });
      expect(r.ok).toBe(true);
    });
  });

  describe('MockEmailAdapter', () => {
    const adapter = new MockEmailAdapter();

    it('returns ok with attachment count in raw', async () => {
      const r = await adapter.send({
        to: 'a@b.com',
        from: 'noreply@x.com',
        subject: 'Invoice',
        html: '<p>Hi</p>',
        text: 'Hi',
        attachments: [
          { filename: 'inv.pdf', contentType: 'application/pdf', contentBase64: 'ZGF0YQ==' },
        ],
        idempotencyKey: 'test-email-1',
      });
      expect(r.ok).toBe(true);
      expect(r.providerMessageId).toBe('MOCK-EMAIL-test-email-1');
      expect((r.raw as Record<string, unknown>)['subject']).toBe('Invoice');
    });
  });

  describe('VapidPushAdapter', () => {
    it('rejects when VAPID keys are missing', async () => {
      const adapter = new VapidPushAdapter({ publicKey: '', privateKey: '', subject: 'mailto:x@y.z' });
      const r = await adapter.send({
        subscriptionEndpoint: 'https://example.com/push/abc',
        subscriptionKeysP256dh: 'k',
        subscriptionKeysAuth: 'a',
        title: 'Hi',
        body: 'Body',
        url: undefined,
        idempotencyKey: 'push-1',
      });
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/VAPID keys not configured/);
    });

    it('accepts when keys are present (mock behavior)', async () => {
      const adapter = new VapidPushAdapter({
        publicKey: 'mock-pub',
        privateKey: 'mock-priv',
        subject: 'mailto:x@y.z',
      });
      const r = await adapter.send({
        subscriptionEndpoint: 'https://example.com/push/abc',
        subscriptionKeysP256dh: 'k',
        subscriptionKeysAuth: 'a',
        title: 'Hi',
        body: 'Body',
        url: undefined,
        idempotencyKey: 'push-2',
      });
      expect(r.ok).toBe(true);
    });
  });
});