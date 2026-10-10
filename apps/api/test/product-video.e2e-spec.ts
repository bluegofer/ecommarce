// apps/api/test/product-video.e2e-spec.ts
// AC-Video: Product video URL is saved, retrieved, and consumed by storefront.
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';
import { createTestApp, cleanDatabase, randomPhone } from './helpers';
import {
  SeedContext,
  SeededUser,
  seedCategory,
  seedProduct,
  seedUserWithRole,
} from './helpers-catalog';

describe('Product video (e2e)', () => {
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
    admin = await seedUserWithRole(ctx, randomPhone(), 'ChangeMe!2026', 'SUPER_ADMIN');
    const cat = await seedCategory(ctx, admin.accessToken, 'Video Cat');
    categoryId = cat.id;
  });

  it('saves youtube video URL on product create', async () => {
    const product = await seedProduct(
      ctx,
      admin.accessToken,
      categoryId,
      'Video Product YT',
      'PUBLISHED',
    );

    const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/products/${product.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ videoUrl })
      .expect(200);

    expect(res.body.videoUrl).toBe(videoUrl);

    const fresh = await prisma.product.findUnique({ where: { id: product.id } });
    expect(fresh?.videoUrl).toBe(videoUrl);
  });

  it('saves vimeo video URL on product update', async () => {
    const product = await seedProduct(
      ctx,
      admin.accessToken,
      categoryId,
      'Video Product Vimeo',
      'PUBLISHED',
    );

    const videoUrl = 'https://vimeo.com/123456789';
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/products/${product.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ videoUrl })
      .expect(200);

    expect(res.body.videoUrl).toBe(videoUrl);
  });

  it('clears video URL when null sent', async () => {
    const product = await seedProduct(
      ctx,
      admin.accessToken,
      categoryId,
      'Video Product Clear',
      'PUBLISHED',
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/products/${product.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ videoUrl: 'https://youtu.be/abc12345678' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/products/${product.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ videoUrl: null })
      .expect(200);

    const fresh = await prisma.product.findUnique({ where: { id: product.id } });
    expect(fresh?.videoUrl).toBeNull();
  });

  it('returns videoUrl in product detail endpoint', async () => {
    const product = await seedProduct(
      ctx,
      admin.accessToken,
      categoryId,
      'Video Product Return',
      'PUBLISHED',
    );

    const videoUrl = 'https://youtu.be/xyz98765432';
    await request(app.getHttpServer())
      .patch(`/api/v1/products/${product.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ videoUrl })
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/products/${product.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(detail.body.videoUrl).toBe(videoUrl);
  });
});