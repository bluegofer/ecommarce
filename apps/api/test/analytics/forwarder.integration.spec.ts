// Step 13.7 — Analytics forwarder smoke test (TDD §6.12).
import { AnalyticsAdapterRegistry } from '../../src/modules/analytics/analytics-adapter.registry';
import { MockAnalyticsAdapter } from '../../src/modules/analytics/adapters/mock-analytics.adapter';
import { Ga4Adapter } from '../../src/modules/analytics/adapters/ga4.adapter';
import { MetaCapiAdapter } from '../../src/modules/analytics/adapters/meta-capi.adapter';

describe('Analytics — adapters smoke', () => {
  describe('MockAnalyticsAdapter', () => {
    it('accepts GA4 event', async () => {
      const a = new MockAnalyticsAdapter('GA4');
      const r = await a.send({
        platform: 'GA4',
        name: 'purchase',
        clientId: 'cid-1',
        userId: undefined,
        timestampMicros: Date.now() * 1000,
        params: { value: 100, currency: 'BDT' },
        userData: {
          emailHash: undefined,
          phoneHash: undefined,
          clientIp: undefined,
          userAgent: undefined,
          fbpCookie: undefined,
          fbcCookie: undefined,
        },
      });
      expect(r.ok).toBe(true);
    });

    it('accepts Meta CAPI event', async () => {
      const a = new MockAnalyticsAdapter('META_CAPI');
      const r = await a.send({
        platform: 'META_CAPI',
        eventName: 'Purchase',
        eventId: 'evt-1',
        eventTime: Math.floor(Date.now() / 1000),
        actionSource: 'website',
        userData: {
          emailHash: 'abc123',
          phoneHash: undefined,
          clientIp: undefined,
          userAgent: undefined,
          fbpCookie: undefined,
          fbcCookie: undefined,
        },
        customData: { value: 100, currency: 'BDT' },
      });
      expect(r.ok).toBe(true);
    });
  });

  describe('Registry', () => {
    it('returns registered adapters by platform', () => {
      const reg = new AnalyticsAdapterRegistry([
        new MockAnalyticsAdapter('GA4'),
        new MockAnalyticsAdapter('META_CAPI'),
      ]);
      expect(reg.all().length).toBe(2);
      expect(reg.get('GA4')).toBeTruthy();
      expect(reg.get('META_CAPI')).toBeTruthy();
    });
  });

  describe('Ga4Adapter rejects wrong-platform', () => {
    it('returns ok=false with wrong platform reason', async () => {
      const a = new Ga4Adapter({ measurementId: 'x', apiSecret: 'y' });
      const r = await a.send({
        platform: 'META_CAPI',
        eventName: 'Purchase',
        eventId: 'e',
        eventTime: 0,
        actionSource: 'website',
        userData: {
          emailHash: undefined,
          phoneHash: undefined,
          clientIp: undefined,
          userAgent: undefined,
          fbpCookie: undefined,
          fbcCookie: undefined,
        },
        customData: {},
      });
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/wrong platform/);
    });
  });

  describe('MetaCapiAdapter rejects wrong-platform', () => {
    it('returns ok=false with wrong platform reason', async () => {
      const a = new MetaCapiAdapter({ pixelId: 'x', accessToken: 'y' });
      const r = await a.send({
        platform: 'GA4',
        name: 'purchase',
        clientId: 'cid',
        userId: undefined,
        timestampMicros: 0,
        params: {},
        userData: {
          emailHash: undefined,
          phoneHash: undefined,
          clientIp: undefined,
          userAgent: undefined,
          fbpCookie: undefined,
          fbcCookie: undefined,
        },
      });
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/wrong platform/);
    });
  });
});