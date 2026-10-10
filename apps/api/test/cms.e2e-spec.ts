// apps/api/test/cms.e2e-spec.ts
// Covers:
//   AC-68 — CMS page edit → new revision; restore an old one.
//           Homepage section reorder reflects in API order without deploy.
//   AC-69 — Home feed returns everything UI Spec C1 needs:
//           hero slides (sections), deal strip (flash sales), banners,
//           carousels, announcements, popups.
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';
import { createTestApp, cleanDatabase, randomPhone } from './helpers';
import { SeedContext, SeededUser, seedUserWithRole } from './helpers-catalog';

describe('CMS (e2e)', () => {
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

  // -------------------------------------------------------------------------
  // AC-68 — Page revisions + restore
  // -------------------------------------------------------------------------

  it('AC-68a: editing a page creates a new revision', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/cms/pages')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        slug: 'about-us',
        titleEn: 'About Us',
        titleBn: 'About Us',
        bodyEn: 'v1 content',
        bodyBn: 'v1 content',
        status: 'PUBLISHED',
      })
      .expect(201);
    const pageId = create.body.id;
    expect(create.body.currentRevision).toBe(1);

    await request(app.getHttpServer())
      .patch(`/api/v1/cms/pages/${pageId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ bodyEn: 'v2 content' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/cms/pages/${pageId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ bodyEn: 'v3 content' })
      .expect(200);

    const fresh = await request(app.getHttpServer())
      .get(`/api/v1/cms/pages/${pageId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(fresh.body.currentRevision).toBe(3);
    expect(fresh.body.bodyEn).toBe('v3 content');

    const revs = await request(app.getHttpServer())
      .get(`/api/v1/cms/pages/${pageId}/revisions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(revs.body).toHaveLength(3);
    expect(revs.body[0].revisionNumber).toBe(3); // newest first
    expect(revs.body[0].bodyEn).toBe('v3 content');
    expect(revs.body[2].bodyEn).toBe('v1 content');
  });

  it('AC-68b: restoring a previous revision writes a new revision (never rewrites history)', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/cms/pages')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        slug: 'terms',
        titleEn: 'Terms',
        titleBn: 'Terms',
        bodyEn: 'initial',
      })
      .expect(201);
    const pageId = create.body.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/cms/pages/${pageId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ bodyEn: 'changed' })
      .expect(200);

    // restore revision 1 (initial)
    const restored = await request(app.getHttpServer())
      .post(`/api/v1/cms/pages/${pageId}/revisions/1/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(201);
    expect(restored.body.bodyEn).toBe('initial');
    expect(restored.body.currentRevision).toBe(3);

    const revs = await request(app.getHttpServer())
      .get(`/api/v1/cms/pages/${pageId}/revisions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(revs.body).toHaveLength(3);
    expect(revs.body[0].revisionNumber).toBe(3);
    expect(revs.body[0].bodyEn).toBe('initial');
    expect(revs.body[1].bodyEn).toBe('changed');
    expect(revs.body[2].bodyEn).toBe('initial');
  });

  // -------------------------------------------------------------------------
  // AC-68c — Section reorder reflects in API order
  // -------------------------------------------------------------------------

  it('AC-68c: section reorder reflects in the visible API order without deploy', async () => {
    const s1 = await request(app.getHttpServer())
      .post('/api/v1/cms/sections')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ key: 'hero', sectionType: 'HERO', titleEn: 'Hero', titleBn: 'Hero', position: 0 })
      .expect(201);
    const s2 = await request(app.getHttpServer())
      .post('/api/v1/cms/sections')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ key: 'deals', sectionType: 'DEALS', titleEn: 'Deals', titleBn: 'Deals', position: 1 })
      .expect(201);
    const s3 = await request(app.getHttpServer())
      .post('/api/v1/cms/sections')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ key: 'banners', sectionType: 'BANNERS', titleEn: 'Banners', titleBn: 'Banners', position: 2 })
      .expect(201);

    let visible = await request(app.getHttpServer())
      .get('/api/v1/cms/sections/visible')
      .expect(200);
    expect(visible.body.map((s: { key: string }) => s.key)).toEqual(['hero', 'deals', 'banners']);

    await request(app.getHttpServer())
      .post('/api/v1/cms/sections/reorder')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ orderedIds: [s3.body.id, s1.body.id, s2.body.id] })
      .expect(201);

    visible = await request(app.getHttpServer())
      .get('/api/v1/cms/sections/visible')
      .expect(200);
    expect(visible.body.map((s: { key: string }) => s.key)).toEqual(['banners', 'hero', 'deals']);
  });

  // -------------------------------------------------------------------------
  // AC-69 — Home feed returns everything C1 needs
  // -------------------------------------------------------------------------

  it('AC-69: /cms/home-feed returns sections, announcements, popups, and active flash sales', async () => {
    // one hero section + one banner section
    await request(app.getHttpServer())
      .post('/api/v1/cms/sections')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ key: 'hero', sectionType: 'HERO', titleEn: 'Big Sale', titleBn: 'বিগ সেল', position: 0 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/cms/sections')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ key: 'promo22', sectionType: 'BANNER_2X2', titleEn: 'Promos', titleBn: 'প্রমো', position: 1 })
      .expect(201);

    // one announcement
    await request(app.getHttpServer())
      .post('/api/v1/cms/announcements')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ textEn: 'Free delivery this Eid', textBn: 'এই ঈদে ফ্রি ডেলিভারি' })
      .expect(201);

    // one popup
    await request(app.getHttpServer())
      .post('/api/v1/cms/popups')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ titleEn: 'Welcome', titleBn: 'স্বাগতম' })
      .expect(201);

    // one running flash sale
    const cat = await prisma.category.create({
      data: { nameEn: 'Feed Cat', nameBn: 'Feed Cat', slug: `feed-${Date.now()}` },
    });
    const prod = await prisma.product.create({
      data: {
        categoryId: cat.id,
        slug: `feed-p-${Date.now()}`,
        titleEn: 'Feed Product',
        titleBn: 'Feed Product',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    const variant = await prisma.variant.create({
      data: { productId: prod.id, sku: `FEED-${Date.now()}`, pricePoisha: 100000, stock: 10, attributeValues: {} },
    });
    await request(app.getHttpServer())
      .post('/api/v1/flash-sales')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        name: 'Home Deals',
        startsAt: new Date(Date.now() - 60_000).toISOString(),
        endsAt: new Date(Date.now() + 3600_000).toISOString(),
        items: [{ variantId: variant.id, dealPricePoisha: 50000, capQuantity: 10 }],
      })
      .expect(201);

    const feed = await request(app.getHttpServer())
      .get('/api/v1/cms/home-feed')
      .expect(200);

    expect(Array.isArray(feed.body.sections)).toBe(true);
    expect(feed.body.sections).toHaveLength(2);
    expect(feed.body.sections[0].key).toBe('hero');
    expect(feed.body.sections[0].sectionType).toBe('HERO');
    expect(feed.body.sections[1].sectionType).toBe('BANNER_2X2');

    expect(feed.body.announcements).toHaveLength(1);
    expect(feed.body.announcements[0].textEn).toMatch(/Eid/);

    expect(feed.body.activePopups).toHaveLength(1);
    expect(feed.body.activePopups[0].titleEn).toBe('Welcome');

    expect(feed.body.activeFlashSales).toHaveLength(1);
    expect(feed.body.activeFlashSales[0].name).toBe('Home Deals');
    expect(feed.body.activeFlashSales[0].itemCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Menus — quick sanity so the header/footer nav can be driven from CMS
  // -------------------------------------------------------------------------

  it('menus CRUD: create HEADER menu, add top-level and nested items, tree returns them', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/cms/menus/HEADER')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Main Menu' })
      .expect(201);

    const top = await request(app.getHttpServer())
      .post('/api/v1/cms/menus/HEADER/items')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ labelEn: 'Electronics', labelBn: 'ইলেকট্রনিক্স', url: '/c/electronics', sortOrder: 0 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/cms/menus/HEADER/items')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        labelEn: 'Headphones',
        labelBn: 'হেডফোন',
        url: '/c/electronics/headphones',
        parentId: top.body.id,
        sortOrder: 0,
      })
      .expect(201);

    const menu = await request(app.getHttpServer())
      .get('/api/v1/cms/menus/HEADER')
      .expect(200);
    expect(menu.body.items).toHaveLength(1);
    expect(menu.body.items[0].labelEn).toBe('Electronics');
    expect(menu.body.items[0].children).toHaveLength(1);
    expect(menu.body.items[0].children[0].labelEn).toBe('Headphones');
  });

  // -------------------------------------------------------------------------
  // Contact form
  // -------------------------------------------------------------------------

  it('contact form submit creates a message visible in the admin list', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/cms/contact')
      .send({
        name: 'Karim',
        email: 'karim@example.com',
        subject: 'Order question',
        message: 'Where is my parcel?',
      })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/v1/cms/contact')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].subject).toBe('Order question');
    expect(list.body[0].status).toBe('NEW');
  });
});