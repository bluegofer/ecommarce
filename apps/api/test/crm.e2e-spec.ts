// apps/api/test/crm.e2e-spec.ts
// Covers:
//   Segment engine filters (min orders, min spend, recency)
//   Customer profile returns addresses, notes timeline, order summary
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';
import { createTestApp, cleanDatabase, randomPhone } from './helpers';
import { SeedContext, SeededUser, seedUserWithRole } from './helpers-catalog';

describe('CRM (e2e)', () => {
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
  });

  it('segment: minOrders filter produces matching count + members', async () => {
    for (let i = 0; i < 5; i += 1) {
      await prisma.customer.create({
        data: {
          phone: randomPhone(),
          fullName: `VIP ${i}`,
          isGuest: false,
          totalOrders: 3 + i,
          totalSpentPoisha: 100000 * (i + 1),
          lastOrderAt: new Date(),
        },
      });
    }
    await prisma.customer.create({
      data: { phone: randomPhone(), fullName: 'Low', isGuest: true, totalOrders: 1 },
    });

    const seg = await request(app.getHttpServer())
      .post('/api/v1/crm/segments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Loyal', filterJson: { minOrders: 3 } })
      .expect(201);

    expect(seg.body.estimatedCount).toBe(5);

    const members = await request(app.getHttpServer())
      .get(`/api/v1/crm/segments/${seg.body.id}/members`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(members.body).toHaveLength(5);
  });

  it('segment: lastOrderWithinDays filter selects only recent buyers', async () => {
    await prisma.customer.create({
      data: {
        phone: randomPhone(),
        fullName: 'Recent',
        isGuest: false,
        lastOrderAt: new Date(Date.now() - 5 * 86400000),
      },
    });
    await prisma.customer.create({
      data: {
        phone: randomPhone(),
        fullName: 'Stale',
        isGuest: false,
        lastOrderAt: new Date(Date.now() - 90 * 86400000),
      },
    });

    const seg = await request(app.getHttpServer())
      .post('/api/v1/crm/segments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Recent30', filterJson: { lastOrderWithinDays: 30 } })
      .expect(201);
    expect(seg.body.estimatedCount).toBe(1);
  });

  it('customer profile returns addresses, notes timeline and last 5 orders', async () => {
    const c = await prisma.customer.create({
      data: { phone: randomPhone(), fullName: 'Full Profile', isGuest: false },
    });
    await prisma.address.create({
      data: {
        customerId: c.id,
        recipientName: 'Full Profile',
        phone: c.phone,
        area: 'Dhanmondi',
        city: 'Dhaka',
        line1: 'House 10',
      },
    });
    await request(app.getHttpServer())
      .post(`/api/v1/crm/customers/${c.id}/notes`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ body: 'Called, prefers evening delivery' })
      .expect(201);

    const profile = await request(app.getHttpServer())
      .get(`/api/v1/crm/customers/${c.id}/profile`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(profile.body.addresses).toHaveLength(1);
    expect(profile.body.addresses[0].area).toBe('Dhanmondi');
    expect(profile.body.notesTimeline).toHaveLength(1);
    expect(profile.body.notesTimeline[0].body).toMatch(/evening/);
    expect(profile.body.orderSummary.total).toBe(0);
  });
});