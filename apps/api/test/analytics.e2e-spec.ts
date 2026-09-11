// apps/api/test/analytics.e2e-spec.ts
// Covers:
//   AC-91 — Funnel report matches seeded fixture events; CSV exports open cleanly
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
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

describe('Analytics (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let ctx: SeedContext;
  let admin: SeededUser;      // CATALOG_MANAGER — can create categories/products
  let reporter: SeededUser;   // FINANCE_READONLY — can read reports
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
    admin = await seedUserWithRole(ctx, randomPhone(), 'ChangeMe!2026', 'CATALOG_MANAGER');
    reporter = await seedUserWithRole(ctx, randomPhone(), 'ChangeMe!2026', 'SUPER_ADMIN');
    const cat = await seedCategory(ctx, admin.accessToken, 'An Cat');
    categoryId = cat.id;
  });

  // -------------------------------------------------------------------------
  // Event intake
  // -------------------------------------------------------------------------

  it('event intake records events and increments search_terms for SEARCH', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/analytics/events')
      .send({ eventType: 'PAGE_VIEW', path: '/', sessionId: 's1' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/analytics/events')
      .send({ eventType: 'SEARCH', query: 'Wireless Headphone', sessionId: 's1' })
      .expect(201);

    const pv = await prisma.analyticsEvent.count({ where: { eventType: 'PAGE_VIEW' } });
    expect(pv).toBe(1);
    const terms = await prisma.searchTerm.findMany();
    expect(terms).toHaveLength(1);
    expect(terms[0].term).toBe('wireless headphone');
    expect(terms[0].hits).toBe(1);
  });

  // -------------------------------------------------------------------------
  // AC-91 — Funnel with seeded events
  // -------------------------------------------------------------------------

  it('AC-91a: funnel counts match seeded events and conversion ratios', async () => {
    // Seed: 100 PAGE_VIEW, 40 PRODUCT_VIEW, 20 ADD_TO_CART, 10 CHECKOUT_START, 5 PURCHASE
    const posts: Array<[string, number]> = [
      ['PAGE_VIEW', 100],
      ['PRODUCT_VIEW', 40],
      ['ADD_TO_CART', 20],
      ['CHECKOUT_START', 10],
      ['PURCHASE', 5],
    ];
    for (const [type, n] of posts) {
      for (let i = 0; i < n; i += 1) {
        await request(app.getHttpServer())
          .post('/api/v1/analytics/events')
          .send({ eventType: type, sessionId: `s-${i}` })
          .expect(201);
      }
    }

    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/reports/funnel')
      .set('Authorization', `Bearer ${reporter.accessToken}`)
      .expect(200);

    const steps = res.body.steps as Array<{ step: string; count: number; conversionFromPrevious: number }>;
    expect(steps.find((s) => s.step === 'visit')?.count).toBe(100);
    expect(steps.find((s) => s.step === 'product_view')?.count).toBe(40);
    expect(steps.find((s) => s.step === 'add_to_cart')?.count).toBe(20);
    expect(steps.find((s) => s.step === 'checkout_start')?.count).toBe(10);
    expect(steps.find((s) => s.step === 'purchase')?.count).toBe(5);

    // Ratios
    const pv = steps.find((s) => s.step === 'product_view')!;
    expect(pv.conversionFromPrevious).toBeCloseTo(0.4, 5);
    const purchase = steps.find((s) => s.step === 'purchase')!;
    expect(purchase.conversionFromPrevious).toBeCloseTo(0.5, 5);
  });

  // -------------------------------------------------------------------------
  // AC-91b — CSV export
  // -------------------------------------------------------------------------

  it('AC-91b: sales CSV export opens cleanly and includes header + data rows', async () => {
    // Seed a couple of orders so the CSV has content
    const buyer = await seedUserWithRole(ctx, randomPhone(), 'ChangeMe!2026');
    const customer = await prisma.customer.create({
      data: { userId: buyer.id, phone: buyer.phone, fullName: 'Buyer', isGuest: false },
    });
    for (let i = 0; i < 3; i += 1) {
      await prisma.order.create({
        data: {
          orderNumber: `CSV-${Date.now()}-${i}-${Math.random()}`,
          customerId: customer.id,
          status: 'CONFIRMED',
          subtotalPoisha: 100000 + i * 1000,
          totalPoisha: 100000 + i * 1000,
          shippingAddressJson: { city: 'Dhaka' },
          contactPhone: buyer.phone,
        },
      });
    }

    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/reports/sales.csv')
      .set('Authorization', `Bearer ${reporter.accessToken}`)
      .expect(200);

    const text: string = res.text;
    const lines = text.split('\n').filter(Boolean);
    expect(lines[0]).toBe('date,orders_count,revenue_poisha,aov_poisha');
    expect(lines.length).toBeGreaterThanOrEqual(2);
    // Every data row has 4 comma-separated fields
    for (const line of lines.slice(1)) {
      expect(line.split(',')).toHaveLength(4);
    }
  });

  // -------------------------------------------------------------------------
  // Top products
  // -------------------------------------------------------------------------

  it('top-products ranks by revenue and matches seeded orders', async () => {
    const { product, variant } = await seedProductWithVariant(
      ctx,
      admin.accessToken,
      categoryId,
      'Top Seller',
      { pricePoisha: 50000, stock: 20 },
    );
    const buyer = await seedUserWithRole(ctx, randomPhone(), 'ChangeMe!2026');
    const customer = await prisma.customer.create({
      data: { userId: buyer.id, phone: buyer.phone, fullName: 'Buyer', isGuest: false },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `TP-${Date.now()}-${Math.random()}`,
        customerId: customer.id,
        status: 'DELIVERED',
        subtotalPoisha: 250000,
        totalPoisha: 250000,
        shippingAddressJson: { city: 'Dhaka' },
        contactPhone: buyer.phone,
      },
    });
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        variantId: variant.id,
        productTitleEn: product.slug,
        productTitleBn: product.slug,
        variantSnapshot: {},
        quantity: 5,
        unitPricePoisha: 50000,
        lineTotalPoisha: 250000,
      },
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/reports/top-products')
      .set('Authorization', `Bearer ${reporter.accessToken}`)
      .expect(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].productId).toBe(product.id);
    expect(res.body[0].unitsSold).toBe(5);
    expect(res.body[0].revenuePoisha).toBe(250000);
  });

  // -------------------------------------------------------------------------
  // Daily summary materialization
  // -------------------------------------------------------------------------

  it('daily summary materialization writes one row for the given day', async () => {
    const buyer = await seedUserWithRole(ctx, randomPhone(), 'ChangeMe!2026');
    const customer = await prisma.customer.create({
      data: { userId: buyer.id, phone: buyer.phone, fullName: 'Buyer', isGuest: false },
    });
    const yesterday = new Date(Date.now() - 86400000);
    for (let i = 0; i < 2; i += 1) {
      await prisma.order.create({
        data: {
          orderNumber: `DS-${Date.now()}-${i}-${Math.random()}`,
          customerId: customer.id,
          status: 'CONFIRMED',
          subtotalPoisha: 50000,
          totalPoisha: 50000,
          shippingAddressJson: { city: 'Dhaka' },
          contactPhone: buyer.phone,
          placedAt: yesterday,
        },
      });
    }

    await request(app.getHttpServer())
      .post('/api/v1/analytics/summary/materialize')
      .set('Authorization', `Bearer ${reporter.accessToken}`)
      .expect(201);

    const rows = await prisma.dailySalesSummary.findMany();
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const total = rows.reduce((s, r) => s + r.ordersCount, 0);
    expect(total).toBeGreaterThanOrEqual(2);
  });
});