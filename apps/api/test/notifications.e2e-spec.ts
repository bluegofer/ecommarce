// apps/api/test/notifications.e2e-spec.ts
// Covers:
//   AC-81 — Abandoned-cart job triggers once per cart at threshold;
//           second nudge carries coupon when configured.
//   AC-82 — Notification log shows rendered bn+en bodies.
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';
import { createTestApp, cleanDatabase, randomPhone } from './helpers';
import { SeedContext, SeededUser, seedUserWithRole } from './helpers-catalog';
import { SchedulersService } from '../src/modules/notifications/schedulers.service';

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let ctx: SeedContext;
  let admin: SeededUser;

  beforeAll(async () => {
    const created = await createTestApp();
    app = created.app;
    prisma = created.prisma;
    redis = created.redis;
    ctx = { app, prisma };
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma, redis);
    admin = await seedUserWithRole(ctx, randomPhone(), 'ChangeMe!2026', 'MARKETING_MANAGER');

    // Seed the templates we need
    for (const [key, subjectEn, subjectBn, bodyEn, bodyBn] of [
      [
        'cart.abandoned',
        'Cart reminder',
        'কার্ট রিমাইন্ডার',
        'Hi {{name}}, you have {{itemCount}} items waiting',
        'হ্যালো {{name}}, আপনার {{itemCount}}টি পণ্য অপেক্ষা করছে',
      ],
      [
        'cart.abandoned_second',
        'Coupon inside',
        'কুপন আছে',
        'Use {{couponCode}} to save',
        '{{couponCode}} ব্যবহার করুন',
      ],
      [
        'order.placed',
        null,
        null,
        'Order {{orderNumber}} placed',
        'অর্ডার {{orderNumber}} সম্পন্ন',
      ],
    ] as const) {
      await prisma.notificationTemplate.create({
        data: {
          key,
          channel: 'EMAIL',
          subjectEn: subjectEn ?? null,
          subjectBn: subjectBn ?? null,
          bodyEn,
          bodyBn,
        },
      });
    }
  });

  // -------------------------------------------------------------------------
  // AC-82 — Rendered bn+en body
  // -------------------------------------------------------------------------

  it('AC-82: notification log entry contains rendered EN + BN bodies', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/notifications/dispatch')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        templateKey: 'order.placed',
        channel: 'EMAIL',
        recipient: '+8801700000000',
        variables: { orderNumber: 'SKY-TEST-123' },
      })
      .expect(201);

    const log = await prisma.notificationLog.findFirst({
      where: { templateKey: 'order.placed' },
    });
    expect(log).toBeTruthy();
    expect(log?.renderedBody).toContain('SKY-TEST-123');
    expect(log?.renderedBody).toContain('[EN]');
    expect(log?.renderedBody).toContain('[BN]');
    expect(log?.renderedBody).toContain('অর্ডার SKY-TEST-123 সম্পন্ন');
  });

  it('AC-82b: inactive template → log row marked SUPPRESSED', async () => {
    await prisma.notificationTemplate.update({
      where: { key_channel: { key: 'order.placed', channel: 'EMAIL' } },
      data: { isActive: false },
    });
    await request(app.getHttpServer())
      .post('/api/v1/notifications/dispatch')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        templateKey: 'order.placed',
        channel: 'EMAIL',
        recipient: 'x@y.com',
        variables: { orderNumber: 'X' },
      })
      .expect(201);
    const log = await prisma.notificationLog.findFirst({
      where: { templateKey: 'order.placed', status: 'SUPPRESSED' },
    });
    expect(log).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // AC-81 — Abandoned cart scheduler
  // -------------------------------------------------------------------------

  async function makeAbandonedCart(opts: {
    idleMinutesAgo: number;
    withCoupon: boolean;
  }) {
    const customer = await prisma.customer.create({
      data: {
        phone: randomPhone(),
        email: 'abandon@test.local',
        fullName: 'Abandon Buyer',
        isGuest: false,
      },
    });
    const cat = await prisma.category.create({
      data: { nameEn: 'AB Cat', nameBn: 'AB Cat', slug: `ab-${Date.now()}-${Math.random()}` },
    });
    const prod = await prisma.product.create({
      data: {
        categoryId: cat.id,
        slug: `ab-p-${Date.now()}-${Math.random()}`,
        titleEn: 'AB Product',
        titleBn: 'AB Product',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    const variant = await prisma.variant.create({
      data: {
        productId: prod.id,
        sku: `AB-${Date.now()}-${Math.random()}`,
        pricePoisha: 50000,
        stock: 10,
        attributeValues: {},
      },
    });
    const cart = await prisma.cart.create({
      data: {
        customerId: customer.id,
        state: 'ACTIVE',
        lastActivityAt: new Date(Date.now() - opts.idleMinutesAgo * 60_000),
        items: { create: [{ variantId: variant.id, quantity: 1 }] },
      },
    });
    if (opts.withCoupon) {
      await prisma.coupon.create({
        data: {
          code: `CART-${Date.now()}`,
          type: 'PERCENTAGE',
          valuePercent: 10,
          isActive: true,
        },
      });
    }
    return { cart, customer };
  }

  it('AC-81a: first abandoned tick nudges a cart once', async () => {
    const { cart } = await makeAbandonedCart({ idleMinutesAgo: 120, withCoupon: false });

    const schedulers = app.get(SchedulersService);
    const r1 = await schedulers.tickAbandonedCarts(new Date(), 60, 24 * 60);
    expect(r1.nudged).toBe(1);

    const fresh = await prisma.cart.findUnique({ where: { id: cart.id } });
    expect(fresh?.reminderCount).toBe(1);
    expect(fresh?.reminderSentAt).not.toBeNull();

    // Running the same tick again immediately does not re-nudge
    const r2 = await schedulers.tickAbandonedCarts(new Date(), 60, 24 * 60);
    expect(r2.nudged).toBe(0);
  });

  it('AC-81b: second nudge carries a coupon code when one is configured', async () => {
    const { cart } = await makeAbandonedCart({ idleMinutesAgo: 120, withCoupon: true });
    const schedulers = app.get(SchedulersService);

    // First nudge
    await schedulers.tickAbandonedCarts(new Date(), 60, 24 * 60);

    // Fast-forward 25 hours and tick again
    const later = new Date(Date.now() + 25 * 60 * 60 * 1000);
    const r2 = await schedulers.tickAbandonedCarts(later, 60, 24 * 60);
    expect(r2.nudged).toBe(1);

    const fresh = await prisma.cart.findUnique({ where: { id: cart.id } });
    expect(fresh?.reminderCount).toBe(2);

    const secondLog = await prisma.notificationLog.findFirst({
      where: { templateKey: 'cart.abandoned_second' },
      orderBy: { createdAt: 'desc' },
    });
    expect(secondLog).toBeTruthy();
    expect(secondLog?.renderedBody).toMatch(/CART-/);
  });

  it('AC-81c: cart with zero items is skipped', async () => {
    const customer = await prisma.customer.create({
      data: { phone: randomPhone(), fullName: 'Empty', isGuest: false },
    });
    await prisma.cart.create({
      data: {
        customerId: customer.id,
        state: 'ACTIVE',
        lastActivityAt: new Date(Date.now() - 120 * 60_000),
      },
    });
    const schedulers = app.get(SchedulersService);
    const r = await schedulers.tickAbandonedCarts(new Date(), 60, 24 * 60);
    expect(r.nudged).toBe(0);
  });
});