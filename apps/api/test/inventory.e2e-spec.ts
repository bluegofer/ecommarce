// apps/api/test/inventory.e2e-spec.ts
// Covers:
//   AC-53 — Concurrency: two parallel checkouts for the last unit → exactly one succeeds
//   AC-54 — Reservation expiry: abandoned reservation auto-releases stock
//   Adjustment with reason code writes audit row + updates stock
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

describe('Inventory (e2e)', () => {
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
    admin = await seedUserWithRole(ctx, randomPhone(), 'ChangeMe!2026', 'CATALOG_MANAGER');
    const cat = await seedCategory(ctx, admin.accessToken, 'Electronics');
    categoryId = cat.id;
  });

  // -------------------------------------------------------------------------
  // AC-53 — Concurrency: last unit, two parallel buyers, exactly one wins
  // -------------------------------------------------------------------------

  it('AC-53: parallel reservations of the last unit — only one succeeds', async () => {
    const { variant } = await seedProductWithVariant(ctx, admin.accessToken, categoryId, 'Solo Item', {
      stock: 1,
      pricePoisha: 50000,
    });

    // Two parallel HTTP requests reserve 1 unit each from a stock of 1.
    const http = app.getHttpServer();
    const [a, b] = await Promise.all([
      request(http)
        .post('/api/v1/inventory/reserve')
        .send({ variantId: variant.id, quantity: 1, ttlSeconds: 60 }),
      request(http)
        .post('/api/v1/inventory/reserve')
        .send({ variantId: variant.id, quantity: 1, ttlSeconds: 60 }),
    ]);

    const codes = [a.status, b.status].sort();
    expect(codes).toEqual([201, 409]);

    const success = a.status === 201 ? a : b;
    const failure = a.status === 201 ? b : a;
    expect(success.body.reservationId).toBeDefined();
    expect(failure.body.message).toMatch(/insufficient available stock/i);

    // Aggregate reserved quantity is 1 (not 2)
    const reserved = await redis.client.get(`inv:reserved:${variant.id}`);
    expect(Number(reserved)).toBe(1);
  });

  // -------------------------------------------------------------------------
  // AC-54 — Reservation expiry releases stock automatically
  // -------------------------------------------------------------------------

  it('AC-54: abandoned reservation expires and stock is available again', async () => {
    const { variant } = await seedProductWithVariant(ctx, admin.accessToken, categoryId, 'Expiry Item', {
      stock: 1,
      pricePoisha: 50000,
    });

    // Reserve with 1-second TTL
    const first = await request(app.getHttpServer())
      .post('/api/v1/inventory/reserve')
      .send({ variantId: variant.id, quantity: 1, ttlSeconds: 1 })
      .expect(201);
    expect(first.body.reservationId).toBeDefined();

    // While reserved, another reserve should fail
    await request(app.getHttpServer())
      .post('/api/v1/inventory/reserve')
      .send({ variantId: variant.id, quantity: 1, ttlSeconds: 60 })
      .expect(409);

    // Wait for TTL to elapse
    await new Promise((r) => setTimeout(r, 1500));

    // Now the reservation is gone; reserve should succeed again
    const second = await request(app.getHttpServer())
      .post('/api/v1/inventory/reserve')
      .send({ variantId: variant.id, quantity: 1, ttlSeconds: 60 })
      .expect(201);
    expect(second.body.reservationId).toBeDefined();
    expect(second.body.reservationId).not.toBe(first.body.reservationId);
  });

  // -------------------------------------------------------------------------
  // Explicit release returns capacity immediately
  // -------------------------------------------------------------------------

  it('explicit release frees the reserved quantity', async () => {
    const { variant } = await seedProductWithVariant(ctx, admin.accessToken, categoryId, 'Release Item', {
      stock: 2,
      pricePoisha: 50000,
    });

    const r1 = await request(app.getHttpServer())
      .post('/api/v1/inventory/reserve')
      .send({ variantId: variant.id, quantity: 2, ttlSeconds: 300 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/inventory/reserve')
      .send({ variantId: variant.id, quantity: 1, ttlSeconds: 60 })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/api/v1/inventory/release/${variant.id}/${r1.body.reservationId}`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/inventory/reserve')
      .send({ variantId: variant.id, quantity: 2, ttlSeconds: 60 })
      .expect(201);
  });

  // -------------------------------------------------------------------------
  // Adjustment writes stock + audit row with reason code
  // -------------------------------------------------------------------------

  it('adjust writes stock and an inventory_adjustments audit row', async () => {
    const { variant } = await seedProductWithVariant(ctx, admin.accessToken, categoryId, 'Adjust Item', {
      stock: 10,
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        variantId: variant.id,
        delta: -3,
        reason: 'DAMAGE',
        reasonNote: '3 units water damaged',
      })
      .expect(201);

    expect(res.body.stockBefore).toBe(10);
    expect(res.body.stockAfter).toBe(7);
    expect(res.body.delta).toBe(-3);
    expect(res.body.reason).toBe('DAMAGE');
    expect(res.body.reasonNote).toBe('3 units water damaged');

    const fresh = await prisma.variant.findUnique({ where: { id: variant.id } });
    expect(fresh?.stock).toBe(7);

    const rows = await prisma.inventoryAdjustment.findMany({ where: { variantId: variant.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].reason).toBe('DAMAGE');
  });

  it('adjust rejects a delta that would push stock below zero', async () => {
    const { variant } = await seedProductWithVariant(ctx, admin.accessToken, categoryId, 'Neg Item', {
      stock: 2,
    });

    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ variantId: variant.id, delta: -5, reason: 'CORRECTION' })
      .expect(400);

    const fresh = await prisma.variant.findUnique({ where: { id: variant.id } });
    expect(fresh?.stock).toBe(2);
  });

  // -------------------------------------------------------------------------
  // Low-stock list
  // -------------------------------------------------------------------------

  it('low-stock list returns variants at or below their threshold', async () => {
    const { variant } = await seedProductWithVariant(ctx, admin.accessToken, categoryId, 'LowStock Item', {
      stock: 3,
    });
    // bump threshold to 5 so 3 < 5 triggers the alert
    await prisma.variant.update({
      where: { id: variant.id },
      data: { lowStockThreshold: 5 },
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/inventory/low-stock')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((r: { variantId: string }) => r.variantId === variant.id);
    expect(found).toBeDefined();
    expect(found.stock).toBe(3);
    expect(found.lowStockThreshold).toBe(5);
  });

  // -------------------------------------------------------------------------
  // Conditional decrement — the atomic primitive the order flow will use
  // -------------------------------------------------------------------------

  it('tryDecrement returns false when stock is insufficient and true otherwise', async () => {
    const { variant } = await seedProductWithVariant(ctx, admin.accessToken, categoryId, 'Dec Item', {
      stock: 2,
    });

    // Access the service through the app instance
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { StockService } = require('../src/modules/inventory/stock.service');
    const stockService = app.get(StockService);

    expect(await stockService.tryDecrement(variant.id, 2)).toBe(true);
    expect(await stockService.tryDecrement(variant.id, 1)).toBe(false);

    const fresh = await prisma.variant.findUnique({ where: { id: variant.id } });
    expect(fresh?.stock).toBe(0);
  });
});