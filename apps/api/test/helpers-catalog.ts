// apps/api/test/helpers-catalog.ts
// Factory helpers for catalog/inventory/search tests.
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { uniqueSuffix } from './helpers';

export interface SeedContext {
  app: INestApplication;
  prisma: PrismaService;
}

// ---------------------------------------------------------------------------
// Users & roles
// ---------------------------------------------------------------------------

export interface SeededUser {
  id: string;
  phone: string;
  accessToken: string;
  refreshCookie: string;
}

/**
 * Create a user via the public API, verify phone with the dev OTP returned
 * by register, then log in. Optionally grant a role (creates the role row
 * if missing — full admin user management arrives in Step 9).
 */
export async function seedUserWithRole(
  ctx: SeedContext,
  phone: string,
  password: string,
  roleCode?: string,
): Promise<SeededUser> {
  const http = ctx.app.getHttpServer();

  const reg = await request(http)
    .post('/api/v1/auth/register')
    .send({ phone, password, fullName: 'Test User' })
    .expect(201);
  const userId: string = reg.body.userId;
  const devCode: string = reg.body.devCode;
  if (!userId || !devCode) {
    throw new Error(
      `register did not return userId/devCode. Got: ${JSON.stringify(reg.body)}`,
    );
  }

  await request(http)
    .post('/api/v1/auth/otp/verify')
    .send({ phone, code: devCode })
    .expect(200);

  const login = await request(http)
    .post('/api/v1/auth/login')
    .send({ identifier: phone, password })
    .expect(200);

  const setCookie = login.headers['set-cookie'];
  const refreshCookie = Array.isArray(setCookie) ? setCookie.join('; ') : String(setCookie ?? '');
  const accessToken: string = login.body.accessToken;

  if (roleCode) {
    await grantRole(ctx.prisma, userId, roleCode);
  }

  return { id: userId, phone, accessToken, refreshCookie };
}

export async function grantRole(
  prisma: PrismaService,
  userId: string,
  roleCode: string,
): Promise<void> {
  const role = await prisma.role.upsert({
    where: { code: roleCode },
    create: { code: roleCode, name: roleCode, description: null },
    update: {},
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    create: { userId, roleId: role.id },
    update: {},
  });
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export interface SeededCategory {
  id: string;
  slug: string;
}

export async function seedCategory(
  ctx: SeedContext,
  token: string | null,
  nameEn: string,
  parentId?: string,
): Promise<SeededCategory> {
  const slug = `${nameEn.toLowerCase().replace(/\s+/g, '-')}-${uniqueSuffix()}`;
  if (token) {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ nameEn, nameBn: nameEn, slug, parentId: parentId ?? null })
      .expect(201);
    return { id: res.body.id, slug: res.body.slug };
  }
  const row = await ctx.prisma.category.create({
    data: { nameEn, nameBn: nameEn, slug, parentId: parentId ?? null },
  });
  return { id: row.id, slug: row.slug };
}

export async function seedAttribute(
  ctx: SeedContext,
  token: string,
  nameEn: string,
  type: 'TEXT' | 'NUMBER' | 'ENUM' | 'BOOLEAN',
  options?: string[],
  isVariant = false,
): Promise<{ id: string; slug: string }> {
  const slug = `${nameEn.toLowerCase().replace(/\s+/g, '-')}-${uniqueSuffix()}`;
  const res = await request(ctx.app.getHttpServer())
    .post('/api/v1/attributes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      nameEn,
      nameBn: nameEn,
      slug,
      type,
      options: options ?? undefined,
      isVariant,
      isFilterable: true,
    })
    .expect(201);
  return { id: res.body.id, slug: res.body.slug };
}

export interface SeededProduct {
  id: string;
  slug: string;
}

export async function seedProduct(
  ctx: SeedContext,
  token: string,
  categoryId: string,
  titleEn: string,
  status: 'DRAFT' | 'PUBLISHED' = 'PUBLISHED',
  brand?: string,
): Promise<SeededProduct> {
  const slug = `${titleEn.toLowerCase().replace(/\s+/g, '-').slice(0, 40)}-${uniqueSuffix()}`;
  const res = await request(ctx.app.getHttpServer())
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      categoryId,
      slug,
      titleEn,
      titleBn: titleEn,
      brand: brand ?? null,
      status,
    })
    .expect(201);
  return { id: res.body.id, slug: res.body.slug };
}

export interface SeededVariant {
  id: string;
  sku: string;
  pricePoisha: number;
  stock: number;
}

export async function seedVariant(
  ctx: SeedContext,
  token: string,
  productId: string,
  opts: {
    sku?: string;
    pricePoisha?: number;
    compareAtPoisha?: number | null;
    stock?: number;
    attributeValues?: Record<string, string>;
  },
): Promise<SeededVariant> {
  const sku = opts.sku ?? `SKU-${uniqueSuffix()}`;
  const res = await request(ctx.app.getHttpServer())
    .post(`/api/v1/variants/product/${productId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      sku,
      pricePoisha: opts.pricePoisha ?? 100000,
      compareAtPoisha: opts.compareAtPoisha ?? null,
      stock: opts.stock ?? 10,
      attributeValues: opts.attributeValues ?? {},
    })
    .expect(201);
  return {
    id: res.body.id,
    sku: res.body.sku,
    pricePoisha: res.body.pricePoisha,
    stock: res.body.stock,
  };
}

export async function seedProductWithVariant(
  ctx: SeedContext,
  token: string,
  categoryId: string,
  titleEn: string,
  variantOpts: {
    pricePoisha?: number;
    stock?: number;
    brand?: string;
    status?: 'DRAFT' | 'PUBLISHED';
  } = {},
): Promise<{ product: SeededProduct; variant: SeededVariant }> {
  const product = await seedProduct(
    ctx,
    token,
    categoryId,
    titleEn,
    variantOpts.status ?? 'PUBLISHED',
    variantOpts.brand,
  );
  const variant = await seedVariant(ctx, token, product.id, {
    pricePoisha: variantOpts.pricePoisha ?? 100000,
    stock: variantOpts.stock ?? 10,
  });
  return { product, variant };
}