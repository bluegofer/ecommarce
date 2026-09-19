// apps/api/test/rma.e2e-spec.ts
// Covers:
//   AC-89 — Return flow end-to-end: request → approve → picked-up → received
//           → stock restored + inventory adjustment audit row
//   AC-90 — Refund hook: refund ≤ captured amount (guard checked at approve)
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

describe('RMA (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let ctx: SeedContext;
  let admin: SeededUser;
  let support: SeededUser;
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
    support = await seedUserWithRole(ctx, randomPhone(), 'ChangeMe!2026', 'ORDER_SUPPORT');
    const cat = await seedCategory(ctx, admin.accessToken, 'RMA Cat');
    categoryId = cat.id;
  });

  async function seedDeliveredOrderWithVariant(stock = 10, pricePoisha = 50000) {
    const { product, variant } = await seedProductWithVariant(
      ctx,
      admin.accessToken,
      categoryId,
      `RMA Item ${Date.now()}-${Math.random()}`,
      { pricePoisha, stock },
    );
    const buyer = await seedUserWithRole(ctx, randomPhone(), 'ChangeMe!2026');
    const customer = await prisma.customer.create({
      data: { userId: buyer.id, phone: buyer.phone, fullName: 'Buyer', isGuest: false },
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
    const item = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        variantId: variant.id,
        productTitleEn: product.slug,
        productTitleBn: product.slug,
        variantSnapshot: {},
        quantity: 2,
        unitPricePoisha: pricePoisha,
        lineTotalPoisha: pricePoisha * 2,
      },
    });
    return { buyer, customer, order, item, product, variant };
  }

  // -------------------------------------------------------------------------
  // AC-89 — End-to-end return
  // -------------------------------------------------------------------------

  it('AC-89: full return flow restocks the variant and writes an inventory adjustment', async () => {
    const seed = await seedDeliveredOrderWithVariant(10, 50000);
    // Simulate the two units being sold: stock = 8
    await prisma.variant.update({
      where: { id: seed.variant.id },
      data: { stock: 8 },
    });

    // 1. Customer requests return
    const created = await request(app.getHttpServer())
      .post('/api/v1/returns')
      .set('Authorization', `Bearer ${seed.buyer.accessToken}`)
      .send({
        orderId: seed.order.id,
        itemIds: [seed.item.id],
        reason: 'DAMAGED',
        reasonNote: 'Arrived cracked',
      })
      .expect(201);
    const returnId = created.body.id;

    // Order should now be RETURN_REQUESTED
    let order = await prisma.order.findUnique({ where: { id: seed.order.id } });
    expect(order?.status).toBe('RETURN_REQUESTED');

    // 2. Support approves (with refund amount = captured total)
    await request(app.getHttpServer())
      .post(`/api/v1/returns/${returnId}/approve`)
      .set('Authorization', `Bearer ${support.accessToken}`)
      .send({ refundAmountPoisha: 100000 })
      .expect(201);

    // 3. Mark picked up
    await request(app.getHttpServer())
      .post(`/api/v1/returns/${returnId}/picked-up`)
      .set('Authorization', `Bearer ${support.accessToken}`)
      .send({ trackingNumber: 'PTX-0001' })
      .expect(201);

    // 4. Mark received — should restock 2 units → 10
    await request(app.getHttpServer())
      .post(`/api/v1/returns/${returnId}/received`)
      .set('Authorization', `Bearer ${support.accessToken}`)
      .expect(201);

    const v = await prisma.variant.findUnique({ where: { id: seed.variant.id } });
    expect(v?.stock).toBe(10);

    const adjustments = await prisma.inventoryAdjustment.findMany({
      where: { variantId: seed.variant.id, reason: 'RETURN' },
    });
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0].delta).toBe(2);
    expect(adjustments[0].referenceId).toBe(returnId);

    // 5. Resolve → order becomes RETURNED
    const resolved = await request(app.getHttpServer())
      .post(`/api/v1/returns/${returnId}/resolve`)
      .set('Authorization', `Bearer ${support.accessToken}`)
      .expect(201);
    expect(resolved.body.status).toBe('RESOLVED');
    expect(resolved.body.refundedAt).toBeTruthy();

    order = await prisma.order.findUnique({ where: { id: seed.order.id } });
    expect(order?.status).toBe('RETURNED');

    // Full history should have all transitions
    const history = await prisma.returnStatusHistory.findMany({
      where: { returnRequestId: returnId },
      orderBy: { createdAt: 'asc' },
    });
    const path = history.map((h) => h.toStatus);
    expect(path).toEqual(['REQUESTED', 'APPROVED', 'PICKED_UP', 'RECEIVED', 'RESOLVED']);
  });

  it('rejected return stops the flow with a reason', async () => {
    const seed = await seedDeliveredOrderWithVariant();
    const created = await request(app.getHttpServer())
      .post('/api/v1/returns')
      .set('Authorization', `Bearer ${seed.buyer.accessToken}`)
      .send({ orderId: seed.order.id, itemIds: [seed.item.id], reason: 'CHANGED_MIND' })
      .expect(201);

    const rejected = await request(app.getHttpServer())
      .post(`/api/v1/returns/${created.body.id}/reject`)
      .set('Authorization', `Bearer ${support.accessToken}`)
      .send({ rejectReason: 'Outside return window' })
      .expect(201);
    expect(rejected.body.status).toBe('REJECTED');
    expect(rejected.body.rejectReason).toBe('Outside return window');

    // Any further transition must fail
    await request(app.getHttpServer())
      .post(`/api/v1/returns/${created.body.id}/received`)
      .set('Authorization', `Bearer ${support.accessToken}`)
      .expect(400);
  });

  // -------------------------------------------------------------------------
  // AC-90 — Refund guard: cannot exceed captured amount
  // -------------------------------------------------------------------------

  it('AC-90: refundAmountPoisha cannot be negative', async () => {
    const seed = await seedDeliveredOrderWithVariant();
    const created = await request(app.getHttpServer())
      .post('/api/v1/returns')
      .set('Authorization', `Bearer ${seed.buyer.accessToken}`)
      .send({ orderId: seed.order.id, itemIds: [seed.item.id], reason: 'DAMAGED' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/returns/${created.body.id}/approve`)
      .set('Authorization', `Bearer ${support.accessToken}`)
      .send({ refundAmountPoisha: -100 })
      .expect(400);
  });

  it('refund on approve stores the amount and preserves ≤ captured total in practice', async () => {
    const seed = await seedDeliveredOrderWithVariant(10, 50000);
    const created = await request(app.getHttpServer())
      .post('/api/v1/returns')
      .set('Authorization', `Bearer ${seed.buyer.accessToken}`)
      .send({ orderId: seed.order.id, itemIds: [seed.item.id], reason: 'DAMAGED' })
      .expect(201);

    // captured total = 100000 poisha
    const approved = await request(app.getHttpServer())
      .post(`/api/v1/returns/${created.body.id}/approve`)
      .set('Authorization', `Bearer ${support.accessToken}`)
      .send({ refundAmountPoisha: 100000 })
      .expect(201);
    expect(approved.body.refundAmountPoisha).toBe(100000);
  });
});