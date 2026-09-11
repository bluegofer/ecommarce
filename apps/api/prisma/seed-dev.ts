/**
 * Development seed for Step 8 (Storefront Pages C1-C14).
 *
 * Idempotent: wipes dev-catalog data first (leaves users/roles/permissions/orders alone),
 * then inserts a small but representative dataset so storefront pages render real content.
 *
 * Run: pnpm --filter @ecommarce/api seed:dev
 * Requires: prisma/seed.ts already run once (roles/permissions/demo admin).
 *
 * NO real products, brands, or imagery. Placeholders only (UI Spec Part E).
 */

import { PrismaClient, AttributeType, CmsMenuLocation } from '@prisma/client';

const prisma = new PrismaClient();

// ── Placeholder SVG data URI (neutral, never a broken image) ──
const PH = (label: string, bg = 'EFF7FB', fg = '25729A') =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#${bg}"/><text x="200" y="200" font-family="Inter,sans-serif" font-size="28" font-weight="600" fill="#${fg}" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`,
  )}`;

async function main() {
  console.log('Dev seed starting...');

  // ── Wipe dev-catalog data (idempotent re-runs) ──
  console.log('Wiping existing dev catalog data...');
  await prisma.flashSaleItem.deleteMany({});
  await prisma.flashSale.deleteMany({});
  await prisma.cmsMenuItem.deleteMany({});
  await prisma.cmsMenu.deleteMany({});
  await prisma.cmsSection.deleteMany({});
  await prisma.cmsPageRevision.deleteMany({});
  await prisma.cmsPage.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.productMedia.deleteMany({});
  await prisma.productAttributeValue.deleteMany({});
  await prisma.inventoryAdjustment.deleteMany({});
  await prisma.variant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.categoryAttribute.deleteMany({});
  await prisma.attribute.deleteMany({});
  await prisma.category.deleteMany({});
  // (leave Warehouse — upsert below)

  // ── Warehouse ──
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: { code: 'MAIN', name: 'Main Warehouse', isDefault: true, isActive: true },
  });
  console.log(`Warehouse: ${warehouse.code}`);

  // ── Attributes ──
  const colorAttr = await prisma.attribute.create({
    data: {
      nameEn: 'Color', nameBn: 'রঙ', slug: 'color',
      type: AttributeType.ENUM, isVariant: true, isFilterable: true, sortOrder: 1,
      options: [
        { value: 'black', labelEn: 'Black', labelBn: 'কালো' },
        { value: 'white', labelEn: 'White', labelBn: 'সাদা' },
        { value: 'blue',  labelEn: 'Blue',  labelBn: 'নীল' },
      ],
    },
  });
  const sizeAttr = await prisma.attribute.create({
    data: {
      nameEn: 'Size', nameBn: 'সাইজ', slug: 'size',
      type: AttributeType.ENUM, isVariant: true, isFilterable: true, sortOrder: 2,
      options: [
        { value: 's', labelEn: 'S', labelBn: 'S' },
        { value: 'm', labelEn: 'M', labelBn: 'M' },
        { value: 'l', labelEn: 'L', labelBn: 'L' },
      ],
    },
  });
  const brandAttr = await prisma.attribute.create({
    data: {
      nameEn: 'Brand', nameBn: 'ব্র্যান্ড', slug: 'brand',
      type: AttributeType.TEXT, isVariant: false, isFilterable: true, sortOrder: 3,
    },
  });
  console.log('Attributes: Color, Size, Brand');

  // ── Categories (tree) ──
  const electronics = await prisma.category.create({
    data: {
      nameEn: 'Electronics', nameBn: 'ইলেকট্রনিক্স', slug: 'electronics',
      iconName: 'device', sortOrder: 1, isActive: true,
      metaTitle: 'Electronics — Buy Online | SkyMart',
      metaDescription: 'Shop the latest electronics with free delivery over ৳1500.',
    },
  });
  const headphones = await prisma.category.create({
    data: {
      nameEn: 'Headphones', nameBn: 'হেডফোন', slug: 'headphones',
      parentId: electronics.id, sortOrder: 1, isActive: true,
    },
  });
  const smartphones = await prisma.category.create({
    data: {
      nameEn: 'Smartphones', nameBn: 'স্মার্টফোন', slug: 'smartphones',
      parentId: electronics.id, sortOrder: 2, isActive: true,
    },
  });
  const fashion = await prisma.category.create({
    data: {
      nameEn: 'Fashion', nameBn: 'ফ্যাশন', slug: 'fashion',
      iconName: 'shirt', sortOrder: 2, isActive: true,
    },
  });
  const mensShoes = await prisma.category.create({
    data: {
      nameEn: "Men's Shoes", nameBn: 'পুরুষদের জুতা', slug: 'mens-shoes',
      parentId: fashion.id, sortOrder: 1, isActive: true,
    },
  });
  const home = await prisma.category.create({
    data: {
      nameEn: 'Home & Kitchen', nameBn: 'হোম ও কিচেন', slug: 'home-kitchen',
      iconName: 'home', sortOrder: 3, isActive: true,
    },
  });
  const beauty = await prisma.category.create({
    data: {
      nameEn: 'Beauty', nameBn: 'বিউটি', slug: 'beauty',
      iconName: 'sparkles', sortOrder: 4, isActive: true,
    },
  });
  console.log('Categories: 4 top-level + 3 children');

  // ── Category–Attribute links ──
  await prisma.categoryAttribute.createMany({
    data: [
      { categoryId: headphones.id,  attributeId: colorAttr.id, sortOrder: 1 },
      { categoryId: headphones.id,  attributeId: brandAttr.id, sortOrder: 2 },
      { categoryId: smartphones.id, attributeId: colorAttr.id, sortOrder: 1 },
      { categoryId: smartphones.id, attributeId: brandAttr.id, sortOrder: 2 },
      { categoryId: mensShoes.id,   attributeId: colorAttr.id, sortOrder: 1 },
      { categoryId: mensShoes.id,   attributeId: sizeAttr.id,  sortOrder: 2 },
      { categoryId: beauty.id,      attributeId: brandAttr.id, sortOrder: 1 },
    ],
  });

  // ── Products + Variants ──
  type P = {
    titleEn: string; titleBn: string; slug: string; brand: string;
    catId: string; pricePoisha: number; compareAtPoisha?: number;
    stock: number; rating: number; ratingCount: number;
    isFeatured?: boolean; soldCount?: number;
    variants: { sku: string; pricePoisha: number; compareAtPoisha?: number; stock: number; attributeValues: object }[];
  };

  const products: P[] = [
    {
      titleEn: 'Wireless Over-Ear Headphones with Active Noise Cancellation',
      titleBn: 'অ্যাকটিভ নয়েজ ক্যান্সেলিং ওয়্যারলেস ওভার-ইয়ার হেডফোন',
      slug: 'demo-wireless-over-ear-headphones-anc',
      brand: 'AcmeAudio', catId: headphones.id,
      pricePoisha: 219900, compareAtPoisha: 399900, stock: 45,
      rating: 4.4, ratingCount: 4321, isFeatured: true, soldCount: 8120,
      variants: [
        { sku: 'DEMO-HP-ANC-BLK', pricePoisha: 219900, compareAtPoisha: 399900, stock: 25, attributeValues: { color: 'black' } },
        { sku: 'DEMO-HP-ANC-BLU', pricePoisha: 229900, compareAtPoisha: 399900, stock: 20, attributeValues: { color: 'blue' } },
      ],
    },
    {
      titleEn: 'Smart Watch Series X with Heart Rate Monitor & GPS',
      titleBn: 'হার্ট রেট মনিটর ও জিপিএস সহ স্মার্ট ওয়াচ সিরিজ এক্স',
      slug: 'demo-smart-watch-series-x',
      brand: 'AcmeWear', catId: electronics.id,
      pricePoisha: 349900, compareAtPoisha: 560000, stock: 3,
      rating: 5.0, ratingCount: 2110, isFeatured: true, soldCount: 3204,
      variants: [
        { sku: 'DEMO-WATCH-X-BLK-S', pricePoisha: 349900, compareAtPoisha: 560000, stock: 2, attributeValues: { color: 'black', size: 's' } },
        { sku: 'DEMO-WATCH-X-BLK-L', pricePoisha: 359900, compareAtPoisha: 560000, stock: 1, attributeValues: { color: 'black', size: 'l' } },
      ],
    },
    {
      titleEn: 'Non-Stick Cookware Set 7-piece Induction Safe',
      titleBn: 'নন-স্টিক কুকওয়্যার সেট ৭ পিস ইন্ডাকশন সেফ',
      slug: 'demo-non-stick-cookware-set-7pc',
      brand: 'AcmeHome', catId: home.id,
      pricePoisha: 189900, compareAtPoisha: 399900, stock: 0,
      rating: 4.3, ratingCount: 890, soldCount: 1420,
      variants: [
        { sku: 'DEMO-COOK-7PC', pricePoisha: 189900, compareAtPoisha: 399900, stock: 0, attributeValues: {} },
      ],
    },
    {
      titleEn: "Men's Running Shoes Mesh Breathable Lightweight",
      titleBn: 'পুরুষদের রানিং জুতা মেশ ব্রিদেবল লাইটওয়েট',
      slug: 'demo-mens-running-shoes-mesh',
      brand: 'AcmeStep', catId: mensShoes.id,
      pricePoisha: 145000, compareAtPoisha: 210000, stock: 28,
      rating: 4.3, ratingCount: 1560, soldCount: 2100,
      variants: [
        { sku: 'DEMO-SHOE-BLK-M', pricePoisha: 145000, compareAtPoisha: 210000, stock: 10, attributeValues: { color: 'black', size: 'm' } },
        { sku: 'DEMO-SHOE-BLK-L', pricePoisha: 145000, compareAtPoisha: 210000, stock: 10, attributeValues: { color: 'black', size: 'l' } },
        { sku: 'DEMO-SHOE-WHT-M', pricePoisha: 149000, compareAtPoisha: 210000, stock: 8,  attributeValues: { color: 'white', size: 'm' } },
      ],
    },
    {
      titleEn: 'Portable Bluetooth Speaker Waterproof 20-hour Battery',
      titleBn: 'পোর্টেবল ব্লুটুথ স্পিকার ওয়াটারপ্রুফ ২০ ঘণ্টা ব্যাটারি',
      slug: 'demo-portable-bluetooth-speaker',
      brand: 'AcmeAudio', catId: electronics.id,
      pricePoisha: 99900, compareAtPoisha: 250000, stock: 62,
      rating: 5.0, ratingCount: 3204, isFeatured: true, soldCount: 4100,
      variants: [
        { sku: 'DEMO-SPK-BLK', pricePoisha: 99900, compareAtPoisha: 250000, stock: 40, attributeValues: { color: 'black' } },
        { sku: 'DEMO-SPK-BLU', pricePoisha: 99900, compareAtPoisha: 250000, stock: 22, attributeValues: { color: 'blue' } },
      ],
    },
    {
      titleEn: '20000mAh Power Bank Fast Charge PD 22.5W',
      titleBn: '২০০০০mAh পাওয়ার ব্যাংক ফাস্ট চার্জ PD 22.5W',
      slug: 'demo-20000mah-power-bank',
      brand: 'AcmePower', catId: electronics.id,
      pricePoisha: 189000, compareAtPoisha: 252000, stock: 55,
      rating: 4.3, ratingCount: 890, soldCount: 1050,
      variants: [
        { sku: 'DEMO-PB-20K-BLK', pricePoisha: 189000, compareAtPoisha: 252000, stock: 55, attributeValues: { color: 'black' } },
      ],
    },
    {
      titleEn: 'Smart LED Bulb WiFi RGB 16M Colors 9W',
      titleBn: 'স্মার্ট এলইডি বাল্ব ওয়াইফাই RGB ১৬ মিলিয়ন কালার ৯W',
      slug: 'demo-smart-led-bulb-rgb',
      brand: 'AcmeHome', catId: home.id,
      pricePoisha: 49900, compareAtPoisha: 83000, stock: 120,
      rating: 4.3, ratingCount: 75, soldCount: 220,
      variants: [
        { sku: 'DEMO-BULB-RGB', pricePoisha: 49900, compareAtPoisha: 83000, stock: 120, attributeValues: {} },
      ],
    },
    {
      titleEn: 'Organic Face Serum Vitamin C 30ml',
      titleBn: 'অর্গানিক ফেস সিরাম ভিটামিন সি ৩০ml',
      slug: 'demo-organic-face-serum-vitc',
      brand: 'AcmeBeauty', catId: beauty.id,
      pricePoisha: 119900, compareAtPoisha: 265000, stock: 40,
      rating: 5.0, ratingCount: 88, soldCount: 340,
      variants: [
        { sku: 'DEMO-SERUM-VITC-30', pricePoisha: 119900, compareAtPoisha: 265000, stock: 40, attributeValues: {} },
      ],
    },
  ];

  let productCount = 0;
  let variantCount = 0;

  for (const p of products) {
    const product = await prisma.product.create({
      data: {
        categoryId: p.catId,
        slug: p.slug,
        titleEn: p.titleEn,
        titleBn: p.titleBn,
        brand: p.brand,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        descriptionEn: `[PLACEHOLDER] Demo description for ${p.titleEn}. Real copy arrives in Step 14.`,
        descriptionBn: `[PLACEHOLDER] ডেমো বিবরণ — প্রকৃত কনটেন্ট Step 14-এ আসবে।`,
        bulletFeatures: [
          'Placeholder feature one',
          'Placeholder feature two',
          'Placeholder feature three',
        ],
        specsJson: { Brand: p.brand, Warranty: '1 year', Origin: 'Placeholder' },
        avgRating: p.rating,
        ratingCount: p.ratingCount,
        soldCount: p.soldCount ?? 0,
        isFeatured: !!p.isFeatured,
        metaTitle: `${p.titleEn} — Price in Bangladesh | SkyMart`,
        metaDescription: `Buy ${p.titleEn} online at SkyMart.`,
      },
    });
    productCount++;

    // Media: one placeholder image per product
    await prisma.productMedia.create({
      data: {
        productId: product.id,
        type: 'IMAGE',
        url: PH(p.titleEn.split(' ').slice(0, 2).join(' ')),
        altText: p.titleEn,
        sortOrder: 0,
        width: 400,
        height: 400,
      },
    });

    // Variants
    for (const v of p.variants) {
      const variant = await prisma.variant.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          sku: v.sku,
          pricePoisha: v.pricePoisha,
          compareAtPoisha: v.compareAtPoisha ?? null,
          stock: v.stock,
          lowStockThreshold: 5,
          attributeValues: v.attributeValues as object,
          isActive: true,
        },
      });
      variantCount++;

      // Initial stock adjustment record (SALE-reason-coded bootstrap)
      if (v.stock > 0) {
        await prisma.inventoryAdjustment.create({
          data: {
            variantId: variant.id,
            warehouseId: warehouse.id,
            delta: v.stock,
            reason: 'RESTOCK',
            reasonNote: 'Initial dev seed',
            stockBefore: 0,
            stockAfter: v.stock,
          },
        });
      }
    }
  }
  console.log(`Products: ${productCount}, Variants: ${variantCount}`);

  // ── CMS Sections (home feed) ──
  await prisma.cmsSection.createMany({
    data: [
      {
        key: 'home.hero',
        sectionType: 'HERO_CAROUSEL',
        titleEn: 'Mega Electronics Fest', titleBn: 'মেগা ইলেকট্রনিক্স ফেস্ট',
        position: 0, isVisible: true,
        config: {
          autoplayMs: 6000,
          slides: [
            { imageUrl: PH('Hero 1', '164561', 'FFFFFF'), titleEn: 'Up to 60% off Headphones', titleBn: 'হেডফোনে ৬০% পর্যন্ত ছাড়', ctaHref: '/electronics', ctaLabelEn: 'Shop Now', ctaLabelBn: 'কিনুন' },
            { imageUrl: PH('Hero 2', '25729A', 'FFFFFF'), titleEn: 'Smart Watches', titleBn: 'স্মার্ট ওয়াচ', ctaHref: '/smartphones', ctaLabelEn: 'Explore', ctaLabelBn: 'দেখুন' },
          ],
        },
      },
      {
        key: 'home.deals-strip',
        sectionType: 'DEAL_STRIP',
        titleEn: "Today's Deals", titleBn: 'আজকের অফার',
        position: 1, isVisible: true,
        config: { endsAt: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString() },
      },
      {
        key: 'home.best-sellers',
        sectionType: 'PRODUCT_CAROUSEL',
        titleEn: 'Best Sellers', titleBn: 'বেস্ট সেলার',
        position: 2, isVisible: true,
        config: { source: 'best-sellers', limit: 8 },
      },
      {
        key: 'home.new-arrivals',
        sectionType: 'PRODUCT_CAROUSEL',
        titleEn: 'New Arrivals', titleBn: 'নতুন পণ্য',
        position: 3, isVisible: true,
        config: { source: 'new-arrivals', limit: 8 },
      },
    ],
  });
  console.log('CMS Sections: 4 (hero, deals-strip, best-sellers, new-arrivals)');

  // ── CMS Pages ──
  await prisma.cmsPage.createMany({
    data: [
      {
        slug: 'about', titleEn: 'About SkyMart', titleBn: 'স্কাইমার্ট সম্পর্কে',
        bodyEn: '<h2>About SkyMart</h2><p>[PLACEHOLDER] SkyMart is a brand-neutral marketplace placeholder.</p>',
        bodyBn: '<h2>স্কাইমার্ট সম্পর্কে</h2><p>[PLACEHOLDER] স্কাইমার্ট একটি ব্র্যান্ড-নিউট্রাল প্লেসহোল্ডার মার্কেটপ্লেস।</p>',
        status: 'PUBLISHED', publishedAt: new Date(),
      },
      {
        slug: 'contact', titleEn: 'Contact Us', titleBn: 'যোগাযোগ করুন',
        bodyEn: '<h2>Contact</h2><p>[PLACEHOLDER] Call 16-263 or email support@skymart.example.</p>',
        bodyBn: '<h2>যোগাযোগ</h2><p>[PLACEHOLDER] ১৬-২৬৩ নম্বরে কল করুন বা support@skymart.example-এ ইমেইল করুন।</p>',
        status: 'PUBLISHED', publishedAt: new Date(),
      },
      {
        slug: 'returns', titleEn: 'Return Policy', titleBn: 'রিটার্ন পলিসি',
        bodyEn: '<h2>Return Policy</h2><p>7-day returns on most items. See terms.</p>',
        bodyBn: '<h2>রিটার্ন পলিসি</h2><p>বেশিরভাগ পণ্যে ৭ দিনের রিটার্ন। শর্তাবলী দেখুন।</p>',
        status: 'PUBLISHED', publishedAt: new Date(),
      },
    ],
  });
  console.log('CMS Pages: 3 (about, contact, returns)');

  // ── CMS Menus ──
  const headerMenu = await prisma.cmsMenu.create({
    data: {
      location: CmsMenuLocation.HEADER,
      name: 'Main Header',
      items: {
        create: [
          { labelEn: "Today's Deals", labelBn: 'আজকের অফার', url: '/deals', sortOrder: 1, isActive: true },
          { labelEn: 'Best Sellers',   labelBn: 'বেস্ট সেলার', url: '/c/electronics', sortOrder: 2, isActive: true },
          { labelEn: 'New Arrivals',   labelBn: 'নতুন পণ্য',  url: '/c/electronics', sortOrder: 3, isActive: true },
          { labelEn: 'Customer Service', labelBn: 'কাস্টমার সার্ভিস', url: '/pages/contact', sortOrder: 4, isActive: true },
        ],
      },
    },
  });
  await prisma.cmsMenu.create({
    data: {
      location: CmsMenuLocation.FOOTER,
      name: 'Footer',
      items: {
        create: [
          { labelEn: 'About',          labelBn: 'সম্পর্কে',       url: '/pages/about',   sortOrder: 1, isActive: true },
          { labelEn: 'Contact',        labelBn: 'যোগাযোগ',       url: '/pages/contact', sortOrder: 2, isActive: true },
          { labelEn: 'Return Policy',  labelBn: 'রিটার্ন পলিসি', url: '/pages/returns', sortOrder: 3, isActive: true },
        ],
      },
    },
  });
  console.log(`CMS Menus: 2 (HEADER ${headerMenu.id}, FOOTER)`);

  // ── Announcement ──
  await prisma.announcement.create({
    data: {
      textEn: 'Free delivery over ৳1500 — this week only',
      textBn: '১,৫০০ টাকার উপরে ফ্রি ডেলিভারি — শুধু এই সপ্তাহ',
      bgColor: '#164561', textColor: '#FFFFFF',
      linkUrl: '/deals',
      startsAt: new Date(Date.now() - 60 * 1000),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });
  console.log('Announcement: 1 active');

  // ── Flash Sale (active) ──
  const flashSale = await prisma.flashSale.create({
    data: {
      name: 'Electronics Flash Sale',
      description: 'Limited-time deal on selected electronics',
      startsAt: new Date(Date.now() - 60 * 1000),
      endsAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  // Pick first 3 variants to put on sale
  const someVariants = await prisma.variant.findMany({ take: 3, orderBy: { createdAt: 'asc' } });
  for (const v of someVariants) {
    await prisma.flashSaleItem.create({
      data: {
        flashSaleId: flashSale.id,
        variantId: v.id,
        dealPricePoisha: Math.round(v.pricePoisha * 0.75), // 25% off
        capQuantity: 100,
        soldQuantity: 0,
      },
    });
  }
  console.log(`Flash Sale: ${flashSale.id} with ${someVariants.length} items`);

  console.log('\nDev seed complete ✓');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });