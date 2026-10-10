// apps/api/test/reviews.e2e-spec.ts
// Covers:
//   AC-88a — Non-purchaser review attempt rejected
//   AC-88b — Aggregate rating updates exactly with publish/hide (fixture math verified)
//   AC-88c — Verified purchaser can review; one per product per customer
//   AC-88d — Helpful vote is idempotent
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

describe('Reviews (e2e)', () => {
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
    const cat = await seedCategory(ctx, admin.accessToken, 'Reviews Cat');
    categoryId = cat.id;
  });

  /** Create a customer + a DELIVERED order for them covering the given variant */
  async function seedDeliveredBuyer(variantId: string, pricePoisha = 50000) {
    const buyer = await seedUserWithRole(ctx, randomPhone(), 'ChangeMe!2026');
    const customer = await prisma.customer.create({
      data: {
        userId: buyer.id,
        phone: buyer.phone,
        fullName: 'Buyer',
        isGuest: false,
      },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `T-${Date.now()}-${Math.random()}`,
        customerId: customer.id,
        status: 'DELIVERED',
        subtotalPoisha: pricePoisha,
        totalPoisha: pricePoisha,
        shippingAddressJson: { city: 'Dhaka' },
        contactPhone: buyer.phone,
        deliveredAt: new Date(),
      },
    });
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        variantId,
        productTitleEn: 'X',
        productTitleBn: 'X',
        variantSnapshot: {},
        quantity: 1,
        unitPricePoisha: pricePoisha,
        lineTotalPoisha: pricePoisha,
      },
    });
    return { buyer, customer, order };
  }

  // -------------------------------------------------------------------------
  // AC-88a — Non-purchaser rejected
  // -------------------------------------------------------------------------

  it('AC-88a: non-purchaser review attempt is rejected', async () => {
    const { product } = await seedProductWithVariant(
      ctx,
      admin.accessToken,
      categoryId,
      'No Purchase Item',
      { pricePoisha: 50000, stock: 5 },
    );
    const stranger = await seedUserWithRole(ctx, randomPhone(), 'ChangeMe!2026');

    await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .send({ productId: product.id, rating: 5, body: 'Great product!' })
      .expect(403);
  });

  // -------------------------------------------------------------------------
  // AC-88c — Verified purchase accepted, one per customer per product
  // -------------------------------------------------------------------------

  it('AC-88c: verified purchaser can review once; second attempt rejected', async () => {
    const { product, variant } = await seedProductWithVariant(
      ctx,
      admin.accessToken,
      categoryId,
      'Verified Item',
      { pricePoisha: 50000, stock: 5 },
    );
    const { buyer } = await seedDeliveredBuyer(variant.id);

    await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .send({ productId: product.id, rating: 4, body: 'Good value' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .send({ productId: product.id, rating: 5, body: 'Second try' })
      .expect(400);
  });

  // -------------------------------------------------------------------------
  // AC-88b — Aggregate rating math on publish/hide
  // -------------------------------------------------------------------------

  it('AC-88b: aggregate rating updates exactly when reviews are published or hidden', async () => {
    const { product, variant } = await seedProductWithVariant(
      ctx,
      admin.accessToken,
      categoryId,
      'Aggregate Item',
      { pricePoisha: 50000, stock: 5 },
    );

    // 3 buyers with delivered orders; two review with 5, one with 3.
    // Create sequentially to avoid hammering the in-process HTTP server
    // with parallel register+login requests (ECONNRESET under load).
    const buyers: Awaited<ReturnType<typeof seedDeliveredBuyer>>[] = [];
    for (let i = 0; i < 3; i += 1) {
      buyers.push(await seedDeliveredBuyer(variant.id));
    }

    const ids: string[] = [];
    for (let i = 0; i < buyers.length; i += 1) {
      const rating = i === 2 ? 3 : 5;
      const res = await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${buyers[i].buyer.accessToken}`)
        .send({ productId: product.id, rating, body: `Review ${i}` })
        .expect(201);
      ids.push(res.body.id);
    }

    // Before moderation: aggregate is (0,0) because all are PENDING
    let p = await prisma.product.findUnique({ where: { id: product.id } });
    expect(p?.avgRating.toString()).toBe('0');
    expect(p?.ratingCount).toBe(0);

    // Publish the two 5-star reviews
    for (let i = 0; i < 2; i += 1) {
      await request(app.getHttpServer())
        .patch(`/api/v1/reviews/moderation/${ids[i]}`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ status: 'PUBLISHED' })
        .expect(200);
    }
    p = await prisma.product.findUnique({ where: { id: product.id } });
    expect(p?.ratingCount).toBe(2);
    expect(Number(p?.avgRating)).toBe(5);

    // Publish the 3-star review → avg = (5+5+3)/3 = 4.33
    await request(app.getHttpServer())
      .patch(`/api/v1/reviews/moderation/${ids[2]}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'PUBLISHED' })
      .expect(200);
    p = await prisma.product.findUnique({ where: { id: product.id } });
    expect(p?.ratingCount).toBe(3);
    expect(Number(p?.avgRating)).toBe(4.33);

    // Hide one 5-star review → avg = (5+3)/2 = 4.00
    await request(app.getHttpServer())
      .patch(`/api/v1/reviews/moderation/${ids[0]}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'HIDDEN', hiddenReason: 'Spam' })
      .expect(200);
    p = await prisma.product.findUnique({ where: { id: product.id } });
    expect(p?.ratingCount).toBe(2);
    expect(Number(p?.avgRating)).toBe(4);
  });

  it('AC-88b-hidden-requires-reason: hiding without a reason is rejected', async () => {
    const { product, variant } = await seedProductWithVariant(
      ctx,
      admin.accessToken,
      categoryId,
      'Hide Reason Item',
      { pricePoisha: 50000, stock: 5 },
    );
    const { buyer } = await seedDeliveredBuyer(variant.id);
    const created = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .send({ productId: product.id, rating: 3, body: 'okay product' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/reviews/moderation/${created.body.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'HIDDEN' })
      .expect(400);
  });

  // -------------------------------------------------------------------------
  // AC-88d — Helpful vote idempotent
  // -------------------------------------------------------------------------

  it('AC-88d: helpful vote is idempotent per customer', async () => {
    const { product, variant } = await seedProductWithVariant(
      ctx,
      admin.accessToken,
      categoryId,
      'Vote Item',
      { pricePoisha: 50000, stock: 5 },
    );
    const { buyer } = await seedDeliveredBuyer(variant.id);
    const created = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .send({ productId: product.id, rating: 5, body: 'Nice' })
      .expect(201);

    // Publish so vote is allowed
    await request(app.getHttpServer())
      .patch(`/api/v1/reviews/moderation/${created.body.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'PUBLISHED' })
      .expect(200);

    const voter = await seedUserWithRole(ctx, randomPhone(), 'ChangeMe!2026');
    await prisma.customer.create({
      data: { userId: voter.id, phone: voter.phone, fullName: 'Voter', isGuest: false },
    });
    const r1 = await request(app.getHttpServer())
      .post(`/api/v1/reviews/${created.body.id}/helpful`)
      .set('Authorization', `Bearer ${voter.accessToken}`)
      .expect(201);
    const r2 = await request(app.getHttpServer())
      .post(`/api/v1/reviews/${created.body.id}/helpful`)
      .set('Authorization', `Bearer ${voter.accessToken}`)
      .expect(201);
    expect(r1.body.helpfulCount).toBe(1);
    expect(r2.body.helpfulCount).toBe(1);
  });

  it('summary returns published-only histogram + average', async () => {
    const { product, variant } = await seedProductWithVariant(
      ctx,
      admin.accessToken,
      categoryId,
      'Summary Item',
      { pricePoisha: 50000, stock: 5 },
    );
    const a = await seedDeliveredBuyer(variant.id);
    const b = await seedDeliveredBuyer(variant.id);
    const rA = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${a.buyer.accessToken}`)
      .send({ productId: product.id, rating: 5, body: 'wow' })
      .expect(201);
    const rB = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${b.buyer.accessToken}`)
      .send({ productId: product.id, rating: 3, body: 'meh' })
      .expect(201);
    for (const id of [rA.body.id, rB.body.id]) {
      await request(app.getHttpServer())
        .patch(`/api/v1/reviews/moderation/${id}`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ status: 'PUBLISHED' })
        .expect(200);
    }
    const s = await request(app.getHttpServer())
      .get(`/api/v1/reviews/summary/${product.id}`)
      .expect(200);
    expect(s.body.totalCount).toBe(2);
    expect(s.body.avgRating).toBe(4);
    expect(s.body.histogram['5']).toBe(1);
    expect(s.body.histogram['3']).toBe(1);
  });
});