// apps/api/test/search.e2e-spec.ts
// Covers:
//   AC-55a — typo query "headphne" finds "headphone" (trigram)
//   AC-55b — facet counts match filtered result set
//   AC-55c — category-agnostic proof: electronics fixture AND fashion fixture
//            both work through the exact same search code path (zero code change)
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

describe('Search (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let ctx: SeedContext;
  let admin: SeededUser;
  let electronicsId: string;
  let fashionId: string;

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
    const elec = await seedCategory(ctx, admin.accessToken, 'Electronics');
    const fash = await seedCategory(ctx, admin.accessToken, 'Fashion');
    electronicsId = elec.id;
    fashionId = fash.id;
  });

  // -------------------------------------------------------------------------
  // AC-55a — typo tolerance via pg_trgm
  // -------------------------------------------------------------------------

  it('AC-55a: typo "headphne" still finds "headphone" via trigram similarity', async () => {
    await seedProductWithVariant(
      ctx,
      admin.accessToken,
      electronicsId,
      'Wireless Bluetooth Headphone with ANC',
      { pricePoisha: 250000, brand: 'SoundCo' },
    );
    // a decoy so the result isn't just "the only product"
    await seedProductWithVariant(
      ctx,
      admin.accessToken,
      electronicsId,
      'Stainless Steel Kettle 1.7L',
      { pricePoisha: 120000, brand: 'HomeCo' },
    );

    const res = await request(app.getHttpServer())
      .get('/api/v1/search/products')
      .query({ q: 'headphne' })
      .expect(200);

    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    const found = res.body.items.find((i: { titleEn: string }) =>
      i.titleEn.includes('Headphone'),
    );
    expect(found).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // AC-55b — facet counts match filtered results
  // -------------------------------------------------------------------------

  it('AC-55b: brand facet counts match the filtered result set', async () => {
    for (let i = 0; i < 3; i += 1) {
      await seedProductWithVariant(
        ctx,
        admin.accessToken,
        electronicsId,
        `SoundCo Headphone Model ${i}`,
        { pricePoisha: 100000 + i * 10000, brand: 'SoundCo' },
      );
    }
    for (let i = 0; i < 2; i += 1) {
      await seedProductWithVariant(
        ctx,
        admin.accessToken,
        electronicsId,
        `BassCo Headphone Model ${i}`,
        { pricePoisha: 150000 + i * 10000, brand: 'BassCo' },
      );
    }

    const res = await request(app.getHttpServer())
      .get('/api/v1/search/products')
      .query({ q: 'Headphone' })
      .expect(200);

    const brandFacets: Array<{ value: string; count: number }> = res.body.facets.brands;
    const soundCo = brandFacets.find((b) => b.value === 'SoundCo');
    const bassCo = brandFacets.find((b) => b.value === 'BassCo');
    expect(soundCo?.count).toBe(3);
    expect(bassCo?.count).toBe(2);

    // filter by brand=SoundCo → total should drop to 3
    const filtered = await request(app.getHttpServer())
      .get('/api/v1/search/products')
      .query({ q: 'Headphone', brand: 'SoundCo' })
      .expect(200);
    expect(filtered.body.total).toBe(3);
    expect(
      filtered.body.items.every((i: { brand: string }) => i.brand === 'SoundCo'),
    ).toBe(true);
  });

  // -------------------------------------------------------------------------
  // AC-55c — category-agnostic proof (electronics vs fashion, same code path)
  // -------------------------------------------------------------------------

  it('AC-55c: same search endpoint handles electronics AND fashion fixtures with zero code change', async () => {
    // Electronics fixture
    await seedProductWithVariant(
      ctx,
      admin.accessToken,
      electronicsId,
      'Smartphone X200 5G 128GB',
      { pricePoisha: 3000000, brand: 'PhoneCo' },
    );
    // Fashion fixture
    await seedProductWithVariant(
      ctx,
      admin.accessToken,
      fashionId,
      'Mens Cotton Casual Shirt Blue',
      { pricePoisha: 120000, brand: 'WeaveCo' },
    );

    const elecRes = await request(app.getHttpServer())
      .get('/api/v1/search/products')
      .query({ q: 'Smartphone' })
      .expect(200);
    expect(elecRes.body.items).toHaveLength(1);
    expect(elecRes.body.items[0].brand).toBe('PhoneCo');

    const fashRes = await request(app.getHttpServer())
      .get('/api/v1/search/products')
      .query({ q: 'Shirt' })
      .expect(200);
    expect(fashRes.body.items).toHaveLength(1);
    expect(fashRes.body.items[0].brand).toBe('WeaveCo');

    // category facet has both categories (slug prefix match since
    // helper adds a unique suffix to avoid cross-test collisions)
    const all = await request(app.getHttpServer())
      .get('/api/v1/search/products')
      .expect(200);
    const catValues: string[] = all.body.facets.categories.map(
      (c: { value: string }) => c.value,
    );
    expect(catValues.some((v) => v.startsWith('electronics'))).toBe(true);
    expect(catValues.some((v) => v.startsWith('fashion'))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Suggestions endpoint works even when there is nothing to suggest
  // -------------------------------------------------------------------------

  it('suggestions returns empty array for a fresh catalog', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/search/suggestions')
      .query({ q: 'hea' })
      .expect(200);
    expect(res.body.suggestions).toEqual([]);
    expect(Array.isArray(res.body.trending)).toBe(true);
  });
});