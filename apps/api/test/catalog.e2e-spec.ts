// apps/api/test/catalog.e2e-spec.ts
// Covers:
//   AC-57 — Slug rename on a product creates a 301 record in slug_redirects
//   Category tree endpoint (mega-menu shape)
//   Variant matrix generator (cartesian)
//   Draft → Published status transition sets publishedAt
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';
import { createTestApp, cleanDatabase, randomPhone } from './helpers';
import {
  SeedContext,
  SeededUser,
  seedAttribute,
  seedCategory,
  seedProduct,
  seedUserWithRole,
} from './helpers-catalog';

describe('Catalog (e2e)', () => {
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
  // AC-57 — slug rename writes a 301 redirect
  // -------------------------------------------------------------------------

  it('AC-57: renaming a product slug records a 301 redirect', async () => {
    const product = await seedProduct(ctx, admin.accessToken, categoryId, 'Wireless Headphones');
    const oldSlug = product.slug;

    const newSlug = `wireless-headphones-v2-${Date.now().toString(36)}`;
    await request(app.getHttpServer())
      .patch(`/api/v1/products/${product.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ slug: newSlug })
      .expect(200);

    // Old slug must resolve to a 301 record
    const redirectRow = await prisma.slugRedirect.findUnique({ where: { fromSlug: oldSlug } });
    expect(redirectRow).toBeTruthy();
    expect(redirectRow?.toSlug).toBe(newSlug);
    expect(redirectRow?.statusCode).toBe(301);
    expect(redirectRow?.entityType).toBe('product');

    // Redirects list endpoint returns it
    const list = await request(app.getHttpServer())
      .get('/api/v1/products/redirects/list')
      .expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    const match = list.body.find((r: { fromSlug: string }) => r.fromSlug === oldSlug);
    expect(match).toBeTruthy();
    expect(match.toSlug).toBe(newSlug);

    // Product slug endpoint at old slug tells caller about the redirect
    const lookup = await request(app.getHttpServer())
      .get(`/api/v1/products/slug/${oldSlug}`)
      .expect(200);
    expect(lookup.body).toMatchObject({ redirectTo: newSlug, statusCode: 301 });
  });

  // -------------------------------------------------------------------------
  // Category tree
  // -------------------------------------------------------------------------

  it('category tree returns nested structure with children', async () => {
    const parent = await seedCategory(ctx, admin.accessToken, 'Fashion');
    const child = await seedCategory(ctx, admin.accessToken, 'Mens Wear', parent.id);
    const grandchild = await seedCategory(ctx, admin.accessToken, 'Shirts', child.id);

    const res = await request(app.getHttpServer())
      .get('/api/v1/categories/tree')
      .expect(200);

    const parentNode = res.body.find((n: { id: string }) => n.id === parent.id);
    expect(parentNode).toBeDefined();
    expect(parentNode.children).toBeDefined();

    const childNode = parentNode.children.find((n: { id: string }) => n.id === child.id);
    expect(childNode).toBeDefined();

    const grandNode = childNode.children.find((n: { id: string }) => n.id === grandchild.id);
    expect(grandNode).toBeDefined();
    expect(grandNode.children).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Variant matrix generator
  // -------------------------------------------------------------------------

  it('variant matrix generator produces cartesian product with unique SKUs', async () => {
    const product = await seedProduct(ctx, admin.accessToken, categoryId, 'T-Shirt');
    await seedAttribute(ctx, admin.accessToken, 'Color', 'ENUM', ['Red', 'Blue', 'Green'], true);
    await seedAttribute(ctx, admin.accessToken, 'Size', 'ENUM', ['S', 'M', 'L'], true);

    const res = await request(app.getHttpServer())
      .post('/api/v1/variants/matrix')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        productId: product.id,
        axes: [
          { attributeSlug: 'color', values: ['Red', 'Blue', 'Green'] },
          { attributeSlug: 'size', values: ['S', 'M', 'L'] },
        ],
        basePricePoisha: 150000,
        defaultStock: 5,
      })
      .expect(201);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(9);

    const skus = res.body.map((v: { sku: string }) => v.sku);
    expect(new Set(skus).size).toBe(9); // no duplicates

    const combos = res.body.map(
      (v: { attributeValues: Record<string, string> }) =>
        `${v.attributeValues.color}-${v.attributeValues.size}`,
    );
    expect(combos.sort()).toEqual(
      [
        'Red-S', 'Red-M', 'Red-L',
        'Blue-S', 'Blue-M', 'Blue-L',
        'Green-S', 'Green-M', 'Green-L',
      ].sort(),
    );

    // DB has 9 variants
    const count = await prisma.variant.count({ where: { productId: product.id } });
    expect(count).toBe(9);
  });

  // -------------------------------------------------------------------------
  // Draft → Published transition sets publishedAt
  // -------------------------------------------------------------------------

  it('publishing a draft product sets publishedAt', async () => {
    const product = await seedProduct(ctx, admin.accessToken, categoryId, 'Draft Item', 'DRAFT');

    const before = await prisma.product.findUnique({ where: { id: product.id } });
    expect(before?.status).toBe('DRAFT');
    expect(before?.publishedAt).toBeNull();

    await request(app.getHttpServer())
      .patch(`/api/v1/products/${product.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'PUBLISHED' })
      .expect(200);

    const after = await prisma.product.findUnique({ where: { id: product.id } });
    expect(after?.status).toBe('PUBLISHED');
    expect(after?.publishedAt).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // Duplicate slug rejection
  // -------------------------------------------------------------------------

  it('creating two products with the same slug is rejected', async () => {
    const slug = `dupe-${Date.now().toString(36)}`;
    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        categoryId,
        slug,
        titleEn: 'First',
        titleBn: 'First',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        categoryId,
        slug,
        titleEn: 'Second',
        titleBn: 'Second',
      })
      .expect(400);
  });
});