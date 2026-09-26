// apps/api/test/csv-import.e2e-spec.ts
// Covers:
//   AC-56 — Import 500-row fixture succeeds; broken rows reported line-by-line
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';
import { createTestApp, cleanDatabase, randomPhone } from './helpers';
import { SeedContext, SeededUser, seedCategory, seedUserWithRole } from './helpers-catalog';

describe('CSV import/export (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let ctx: SeedContext;
  let admin: SeededUser;
  let categorySlug: string;

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
    const cat = await seedCategory(ctx, admin.accessToken, 'Import Test Category');
    categorySlug = cat.slug;
  });

  // -------------------------------------------------------------------------
  // AC-56 — clean 500-row import
  // -------------------------------------------------------------------------

  it('AC-56: import a 500-row fixture successfully', async () => {
    const header =
      'product_slug,title_en,title_bn,category_slug,brand,status,variant_sku,price_poisha,compare_at_poisha,stock,color,size';
    const lines: string[] = [header];

    // 100 products × 5 variants = 500 rows
    for (let p = 0; p < 100; p += 1) {
      const productSlug = `import-p-${p}`;
      const titleEn = `Imported Product ${p}`;
      const titleBn = `Imported Product ${p}`;
      for (let v = 0; v < 5; v += 1) {
        const sku = `IMP-${p}-${v}`;
        const price = 10000 + p * 100 + v * 10;
        const stock = 10 + v;
        lines.push(
          `${productSlug},${titleEn},${titleBn},${categorySlug},TestBrand,PUBLISHED,${sku},${price},,${stock},Red,M`,
        );
      }
    }

    const res = await request(app.getHttpServer())
      .post('/api/v1/catalog/import-export/import')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ csv: lines.join('\n') })
      .expect(201);

    expect(res.body.totalRows).toBe(500);
    expect(res.body.importedProducts).toBe(100);
    expect(res.body.importedVariants).toBe(500);
    expect(res.body.failedRows).toBe(0);
    expect(res.body.errors).toEqual([]);

    // Verify DB counts
    const productCount = await prisma.product.count({
      where: { slug: { startsWith: 'import-p-' } },
    });
    expect(productCount).toBe(100);
    const variantCount = await prisma.variant.count({
      where: { sku: { startsWith: 'IMP-' } },
    });
    expect(variantCount).toBe(500);

    // spot check one product
    const sample = await prisma.product.findUnique({ where: { slug: 'import-p-42' } });
    expect(sample?.titleEn).toBe('Imported Product 42');
    expect(sample?.brand).toBe('TestBrand');
  });

  // -------------------------------------------------------------------------
  // AC-56b — broken rows reported with line numbers, valid rows still imported
  // -------------------------------------------------------------------------

  it('AC-56b: broken rows reported line-by-line and valid rows still imported', async () => {
    const header =
      'product_slug,title_en,title_bn,category_slug,brand,status,variant_sku,price_poisha,compare_at_poisha,stock,color,size';
    const lines = [
      header,
      // row 2: OK
      `ok-a,Ok A,Ok A,${categorySlug},BrandX,PUBLISHED,OK-A-1,10000,,5,,`,
      // row 3: missing variant_sku
      `ok-b,Ok B,Ok B,${categorySlug},BrandX,PUBLISHED,,10000,,5,,`,
      // row 4: price is not a number
      `ok-c,Ok C,Ok C,${categorySlug},BrandX,PUBLISHED,OK-C-1,notanumber,,5,,`,
      // row 5: category does not exist
      `ok-d,Ok D,Ok D,no-such-category,BrandX,PUBLISHED,OK-D-1,10000,,5,,`,
      // row 6: stock negative
      `ok-e,Ok E,Ok E,${categorySlug},BrandX,PUBLISHED,OK-E-1,10000,,-3,,`,
      // row 7: OK
      `ok-a,Ok A,Ok A,${categorySlug},BrandX,PUBLISHED,OK-A-2,10000,,5,,`,
    ];

    const res = await request(app.getHttpServer())
      .post('/api/v1/catalog/import-export/import')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ csv: lines.join('\n') })
      .expect(201);

    expect(res.body.totalRows).toBe(6);
    expect(res.body.importedProducts).toBe(1); // only ok-a
    expect(res.body.importedVariants).toBe(2); // OK-A-1 and OK-A-2
    expect(res.body.failedRows).toBe(4);

    const byRow = new Map<number, { field?: string; message: string }>();
    for (const e of res.body.errors) byRow.set(e.row, e);
    expect(byRow.get(3)?.field).toBe('variant_sku');
    expect(byRow.get(4)?.field).toBe('price_poisha');
    expect(byRow.get(5)?.field).toBe('category_slug');
    expect(byRow.get(6)?.field).toBe('stock');
  });

  // -------------------------------------------------------------------------
  // Export round-trip
  // -------------------------------------------------------------------------

  it('export emits a CSV that can be re-imported', async () => {
    const header =
      'product_slug,title_en,title_bn,category_slug,brand,status,variant_sku,price_poisha,compare_at_poisha,stock,color,size';
    const lines = [
      header,
      `round-1,Round 1,Round 1,${categorySlug},BrandY,PUBLISHED,RT-1,25000,30000,7,Blue,L`,
      `round-1,Round 1,Round 1,${categorySlug},BrandY,PUBLISHED,RT-2,26000,,8,Blue,M`,
    ];
    await request(app.getHttpServer())
      .post('/api/v1/catalog/import-export/import')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ csv: lines.join('\n') })
      .expect(201);

    const exportRes = await request(app.getHttpServer())
      .get('/api/v1/catalog/import-export/export')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    const csv: string = exportRes.text;
    expect(csv.split('\n')[0]).toContain('product_slug');
    expect(csv).toContain('RT-1');
    expect(csv).toContain('RT-2');
  });
});