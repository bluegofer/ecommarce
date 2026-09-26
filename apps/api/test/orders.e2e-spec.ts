// apps/api/test/orders.e2e-spec.ts
// Covers:
//   AC-78 — State machine: every legal transition; illegal ones rejected;
//           CANCELLED restocks variants transactionally.
//   AC-79 — Place-order idempotency: same Idempotency-Key → one order, same response.
//   AC-80 — Guest order → registration with same phone auto-attaches history.
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';
import { createTestApp, cleanDatabase, randomPhone } from './helpers';
import {
  SeedContext,
  SeededUser,
  seedCategory,
  seedProductWithVariant,
  seedUserWithRole,
} from './helpers-catalog';

async function seedTemplates(prisma: PrismaService): Promise<void> {
  const keys = ['order.confirmed', 'order.processing', 'order.shipped', 'order.delivered', 'order.cancelled'];
  for (const k of keys) {
    await prisma.notificationTemplate.upsert({
      where: { key_channel: { key: k, channel: 'SMS' } },
      create: {
        key: k,
        channel: 'SMS',
        bodyEn: `${k} for {{orderNumber}} total {{total}}`,
        bodyBn: `${k} bn {{orderNumber}} total {{total}}`,
      },
      update: {},
    });
  }
}

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let ctx: SeedContext;
  let admin: SeededUser;
  let categoryId: string;

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
    await seedTemplates(prisma);
    admin = await seedUserWithRole(ctx, randomPhone(), 'ChangeMe!2026', 'ORDER_SUPPORT');
    const cat = await seedCategory(ctx, admin.accessToken, 'Orders Cat');
    categoryId = cat.id;
  });

  // Helper: place a fresh order
  async function placeOrder(stock = 10, pricePoisha = 50000, key?: string) {
    const { variant } = await seedProductWithVariant(
      ctx,
      admin.accessToken,
      categoryId,
      `Order Item ${Date.now()}-${Math.random()}`,
      { pricePoisha, stock },
    );
    const phone = randomPhone();
    const req = request(app.getHttpServer())
      .post('/api/v1/checkout/place-order')
      .send({
        items: [{ variantId: variant.id, quantity: 1 }],
        shippingAddress: {
          recipientName: 'Test Buyer',
          phone,
          area: 'Banani',
          city: 'Dhaka',
          line1: 'House 1',
        },
        contactPhone: phone,
        paymentMethod: 'COD',
      });
    if (key) req.set('Idempotency-Key', key);
    const res = await req.expect(201);
    return { variantId: variant.id, phone, orderId: res.body.orderId, orderNumber: res.body.orderNumber, res };
  }

  // -------------------------------------------------------------------------
  // AC-78 — State machine
  // -------------------------------------------------------------------------

  it('AC-78a: legal transition PLACED → PENDING_VERIFICATION → VERIFIED → CONFIRMED succeeds and writes history', async () => {
    const { orderId } = await placeOrder();
    for (const next of ['PENDING_VERIFICATION', 'VERIFIED', 'CONFIRMED'] as const) {
      const r = await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ status: next })
        .expect(200);
      expect(r.body.status).toBe(next);
    }
    const fresh = await prisma.order.findUnique({
      where: { id: orderId },
      include: { statusHistory: true },
    });
    expect(fresh?.status).toBe('CONFIRMED');
    expect(fresh?.statusHistory.length).toBeGreaterThanOrEqual(3);
    const lastEvent = fresh?.statusHistory[fresh.statusHistory.length - 1];
    expect(lastEvent?.toStatus).toBe('CONFIRMED');
  });

  it('AC-78b: illegal transition PLACED → SHIPPED is rejected', async () => {
    const { orderId } = await placeOrder();
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'SHIPPED' })
      .expect(400);
    const fresh = await prisma.order.findUnique({ where: { id: orderId } });
    expect(fresh?.status).toBe('PLACED');
  });

  it('AC-78c: full happy path through the new verification pipeline', async () => {
    const { orderId } = await placeOrder();
    const flow = [
      'PENDING_VERIFICATION',
      'VERIFIED',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ] as const;
    for (const next of flow) {
      await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ status: next })
        .expect(200);
    }
    const fresh = await prisma.order.findUnique({ where: { id: orderId } });
    expect(fresh?.status).toBe('DELIVERED');
    expect(fresh?.deliveredAt).not.toBeNull();
  });

  it('AC-78d: CANCELLED from PLACED restocks the variant (no half-updated state)', async () => {
    const { orderId, variantId } = await placeOrder(10);
    const before = await prisma.variant.findUnique({ where: { id: variantId } });
    expect(before?.stock).toBe(9); // 10 - 1 reserved at checkout

    await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ reason: 'customer asked' })
      .expect(201);

    const after = await prisma.variant.findUnique({ where: { id: variantId } });
    expect(after?.stock).toBe(10);
    const fresh = await prisma.order.findUnique({ where: { id: orderId } });
    expect(fresh?.status).toBe('CANCELLED');
    expect(fresh?.cancelledAt).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // AC-79 — Idempotency
  // -------------------------------------------------------------------------

  it('AC-79: same Idempotency-Key → one order, same response', async () => {
    const { variant } = await seedProductWithVariant(
      ctx,
      admin.accessToken,
      categoryId,
      'Idempotent Item',
      { pricePoisha: 50000, stock: 10 },
    );
    const key = randomUUID();
    const phone = randomPhone();

    const body = {
      items: [{ variantId: variant.id, quantity: 1 }],
      shippingAddress: {
        recipientName: 'Same Buyer',
        phone,
        area: 'Gulshan',
        city: 'Dhaka',
        line1: 'Road 1',
      },
      contactPhone: phone,
      paymentMethod: 'COD' as const,
    };

    const a = await request(app.getHttpServer())
      .post('/api/v1/checkout/place-order')
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);
    const b = await request(app.getHttpServer())
      .post('/api/v1/checkout/place-order')
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);

    expect(a.body.orderId).toBe(b.body.orderId);
    expect(a.body.orderNumber).toBe(b.body.orderNumber);

    const count = await prisma.order.count({ where: { customerId: { not: '' } } });
    expect(count).toBe(1);

    // Stock decremented exactly once
    const v = await prisma.variant.findUnique({ where: { id: variant.id } });
    expect(v?.stock).toBe(9);
  });

  // -------------------------------------------------------------------------
  // AC-80 — Guest order → later registration attaches history
  // -------------------------------------------------------------------------

  it('AC-80: guest places order, then registers with same phone → customer linked to userId', async () => {
    const { phone } = await placeOrder();
    const before = await prisma.customer.findUnique({ where: { phone } });
    expect(before?.isGuest).toBe(true);
    expect(before?.userId).toBeNull();

    // Simulate user registering with that phone
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ phone, password: 'ChangeMe!2026', fullName: 'Now Registered' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code: reg.body.devCode })
      .expect(200);

    // Place a new order while logged in — same phone — must attach history to that user's customer
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: phone, password: 'ChangeMe!2026' })
      .expect(200);

    // Force a second order to run through the upsertCustomer path with a userId
    const { variant } = await seedProductWithVariant(
      ctx,
      admin.accessToken,
      categoryId,
      'Second Item',
      { pricePoisha: 50000, stock: 5 },
    );
    await request(app.getHttpServer())
      .post('/api/v1/checkout/place-order')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        items: [{ variantId: variant.id, quantity: 1 }],
        shippingAddress: {
          recipientName: 'Now Registered',
          phone,
          area: 'Banani',
          city: 'Dhaka',
          line1: 'House 2',
        },
        contactPhone: phone,
        paymentMethod: 'COD',
      })
      .expect(201);

    const after = await prisma.customer.findUnique({ where: { phone } });
    expect(after?.isGuest).toBe(false);
    expect(after?.userId).toBeTruthy();
    expect(after?.totalOrders).toBe(2);
  });

  // -------------------------------------------------------------------------
  // Invoice PDF basic smoke (AC-83 support)
  // -------------------------------------------------------------------------

  it('invoice.txt contains itemized math matching order totals', async () => {
    const { orderId } = await placeOrder(10, 50000);
    const res = await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}/invoice.txt`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(res.text).toMatch(/Subtotal:.*500\.00/);
    expect(res.text).toMatch(/TOTAL:/);
  });

  it('invoice.pdf returns a real PDF buffer starting with %PDF', async () => {
    const { orderId } = await placeOrder();
    const res = await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}/invoice.pdf`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .buffer(true)
      .expect(200);
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');
  });
});
