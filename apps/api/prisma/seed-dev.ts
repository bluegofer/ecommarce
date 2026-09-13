/**
 * dev seed — minimal demo data for local storefront/API testing.
 *
 * NOT the Step-16 production seed. This only gives the storefront enough
 * content to render: categories, products, variants, media placeholders,
 * one hero banner, one announcement, one flash sale.
 *
 * Rules:
 *   - Every value that will be real content is prefixed [PLACEHOLDER].
 *   - Idempotent: uses upsert; re-running is safe.
 *   - Refuses to run in production (NODE_ENV === 'production').
 *
 * Run:  pnpm seed:dev
 */
import { PrismaClient, ProductStatus, CmsPageStatus } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

const PLACEHOLDER_IMG = '/placeholder.svg';

function svgDataUrl(label: string): string {
  // Small inline SVG so we never hit the network.
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">` +
    `<rect fill="#EFF7FB" width="400" height="400"/>` +
    `<text x="200" y="205" font-family="Inter,system-ui" font-size="20" ` +
    `fill="#25729A" text-anchor="middle">${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seed-dev refuses to run with NODE_ENV=production');
  }
  console.log('[seed-dev] starting…');

  // ---------------------------------------------------------
  // 1. Categories (root + sub)
  // ---------------------------------------------------------
  const rootCats = [
    { slug: 'electronics', en: 'Electronics',      bn: 'ইলেকট্রনিক্স',  icon: 'cpu',   order: 1 },
    { slug: 'fashion',     en: 'Fashion',          bn: 'ফ্যাশন',        icon: 'shirt', order: 2 },
    { slug: 'home-kitchen',en: 'Home & Kitchen',   bn: 'হোম ও কিচেন',   icon: 'home',  order: 3 },
    { slug: 'grocery',     en: 'Grocery',          bn: 'মুদি',          icon: 'apple', order: 4 },
  ];

  const catIds: Record<string, string> = {};
  for (const c of rootCats) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nameEn: c.en, nameBn: c.bn, sortOrder: c.order, isActive: true },
      create: {
        slug: c.slug,
        nameEn: c.en,
        nameBn: c.bn,
        iconName: c.icon,
        sortOrder: c.order,
        isActive: true,
      },
    });
    catIds[c.slug] = row.id;
  }

  const subCats = [
    { slug: 'smartphones',   en: 'Smartphones',   bn: 'স্মার্টফোন',   parent: 'electronics', order: 1 },
    { slug: 'headphones',    en: 'Headphones',    bn: 'হেডফোন',      parent: 'electronics', order: 2 },
    { slug: 'mens-shirts',   en: "Men's Shirts",  bn: 'পুরুষ শার্ট',  parent: 'fashion',     order: 1 },
    { slug: 'kitchen-tools', en: 'Kitchen Tools', bn: 'কিচেন টুলস',   parent: 'home-kitchen',order: 1 },
  ];

  for (const c of subCats) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nameEn: c.en, nameBn: c.bn, parentId: catIds[c.parent] ?? null, isActive: true },
      create: {
        slug: c.slug,
        nameEn: c.en,
        nameBn: c.bn,
        parentId: catIds[c.parent] ?? null,
        sortOrder: c.order,
        isActive: true,
      },
    });
    catIds[c.slug] = row.id;
  }
  console.log(`[seed-dev] categories: ${Object.keys(catIds).length}`);

  // ---------------------------------------------------------
  // 2. Products + variants + media
  // ---------------------------------------------------------
  type Seed = {
    slug: string; cat: string; titleEn: string; titleBn: string;
    brand: string; price: number; compareAt?: number; stock: number;
    featured?: boolean;
  };

  const products: Seed[] = [
    { slug: 'placeholder-wireless-headphone-x200', cat: 'headphones',  titleEn: '[PLACEHOLDER] Wireless Headphone X200', titleBn: '[PLACEHOLDER] ওয়্যারলেস হেডফোন X200', brand: 'GenericBrand', price: 249900, compareAt: 349900, stock: 42, featured: true },
    { slug: 'placeholder-bt-earbuds-a10',          cat: 'headphones',  titleEn: '[PLACEHOLDER] BT Earbuds A10',          titleBn: '[PLACEHOLDER] বি টি ইয়ারবাড A10',        brand: 'GenericBrand', price:  89000, compareAt: 129000, stock: 120 },
    { slug: 'placeholder-smartphone-s1',           cat: 'smartphones', titleEn: '[PLACEHOLDER] Smartphone S1',           titleBn: '[PLACEHOLDER] স্মার্টফোন S1',            brand: 'GenericBrand', price:1899900, compareAt:2199900, stock:  18, featured: true },
    { slug: 'placeholder-smartphone-s1-pro',       cat: 'smartphones', titleEn: '[PLACEHOLDER] Smartphone S1 Pro',       titleBn: '[PLACEHOLDER] স্মার্টফোন S1 Pro',        brand: 'GenericBrand', price:2599900,                    stock:   9 },
    { slug: 'placeholder-cotton-shirt-classic',    cat: 'mens-shirts', titleEn: '[PLACEHOLDER] Cotton Shirt Classic',    titleBn: '[PLACEHOLDER] কটন শার্ট ক্লাসিক',        brand: 'GenericBrand', price:  99000, compareAt: 129000, stock:  60 },
    { slug: 'placeholder-cotton-shirt-slim',       cat: 'mens-shirts', titleEn: '[PLACEHOLDER] Cotton Shirt Slim',       titleBn: '[PLACEHOLDER] কটন শার্ট স্লিম',           brand: 'GenericBrand', price: 109000,                    stock:  35 },
    { slug: 'placeholder-stainless-pan-24cm',      cat: 'kitchen-tools', titleEn: '[PLACEHOLDER] Stainless Pan 24cm',    titleBn: '[PLACEHOLDER] স্টেইনলেস প্যান ২৪সেমি',   brand: 'GenericBrand', price: 149000, compareAt: 189000, stock:  22 },
    { slug: 'placeholder-chef-knife-8in',          cat: 'kitchen-tools', titleEn: '[PLACEHOLDER] Chef Knife 8in',         titleBn: '[PLACEHOLDER] শেফ ছুরি ৮ইঞ্চি',           brand: 'GenericBrand', price:  69000,                    stock:  45 },
  ];

  const variantsBySlug: Record<string, string[]> = {};

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (!p) continue;
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        titleEn: p.titleEn, titleBn: p.titleBn, brand: p.brand,
        status: ProductStatus.PUBLISHED,
        publishedAt: new Date(),
        isFeatured: p.featured ?? false,
      },
      create: {
        slug: p.slug,
        categoryId: catIds[p.cat]!,
        titleEn: p.titleEn,
        titleBn: p.titleBn,
        descriptionEn: '[PLACEHOLDER] Demo description — replace via admin in Step 16.',
        descriptionBn: '[PLACEHOLDER] ডেমো বিবরণ — Step 16-এ admin থেকে প্রতিস্থাপিত হবে।',
        brand: p.brand,
        status: ProductStatus.PUBLISHED,
        publishedAt: new Date(),
        isFeatured: p.featured ?? false,
        bulletFeatures: ['[PLACEHOLDER] Feature 1', '[PLACEHOLDER] Feature 2'],
        specsJson: { Warranty: '[PLACEHOLDER] 1 year' },
      },
    });

    // Two variants per product (color/option), stock split
    const skuA = `${p.slug.toUpperCase().slice(0, 20)}-A`;
    const skuB = `${p.slug.toUpperCase().slice(0, 20)}-B`;
    const vA = await prisma.variant.upsert({
      where: { sku: skuA },
      update: { pricePoisha: p.price, compareAtPoisha: p.compareAt ?? null, stock: p.stock },
      create: {
        productId: product.id, sku: skuA, pricePoisha: p.price,
        compareAtPoisha: p.compareAt ?? null, stock: p.stock,
        attributeValues: { option: 'A' },
      },
    });
    const vB = await prisma.variant.upsert({
      where: { sku: skuB },
      update: { pricePoisha: p.price + 10000, stock: Math.max(0, Math.floor(p.stock / 2)) },
      create: {
        productId: product.id, sku: skuB, pricePoisha: p.price + 10000,
        stock: Math.max(0, Math.floor(p.stock / 2)),
        attributeValues: { option: 'B' },
      },
    });
    variantsBySlug[p.slug] = [vA.id, vB.id];

    // Media — one placeholder image per product (idempotent).
    const mediaUrl = svgDataUrl(p.titleEn.slice(0, 20));
    const existingMedia = await prisma.productMedia.findFirst({
      where: { productId: product.id, url: mediaUrl },
    });
    if (!existingMedia) {
      await prisma.productMedia.create({
        data: {
          productId: product.id,
          type: 'IMAGE',
          url: mediaUrl,
          altText: `${p.titleEn} — front view`,
          sortOrder: 0,
        },
      });
    }
  }
  console.log(`[seed-dev] products: ${products.length}`);

  // ---------------------------------------------------------
  // 3. CMS sections (hero + promo tiles + best sellers)
  // ---------------------------------------------------------
  // HERO_CAROUSEL — storefront page.tsx expects sectionType === 'HERO_CAROUSEL'
  // and config.slides[] with { imageUrl, titleEn, titleBn, ctaHref, ctaLabelEn, ctaLabelBn }.
  const heroSlides = [
    {
      imageUrl: svgDataUrl('Hero 1'),
      titleEn: '20,000 BDT off on smartphones',
      titleBn: '২০,০০০ টাকার বেশি স্মার্টফোনে ছাড়',
      ctaHref: '/c/smartphones',
      ctaLabelEn: 'Shop now',
      ctaLabelBn: 'এখনই কিনুন',
    },
    {
      imageUrl: svgDataUrl('Hero 2'),
      titleEn: 'Fashion fest — up to 50% off',
      titleBn: 'ফ্যাশন ফেস্ট — সর্বোচ্চ ৫০% ছাড়',
      ctaHref: '/c/fashion',
      ctaLabelEn: 'View deals',
      ctaLabelBn: 'ডিল দেখুন',
    },
  ];

  await prisma.cmsSection.upsert({
    where: { key: 'home-hero' },
    update: {
      sectionType: 'HERO_CAROUSEL',
      titleEn: 'Hero carousel', titleBn: 'হিরো ক্যারোসেল',
      config: { slides: heroSlides },
      isVisible: true,
    },
    create: {
      key: 'home-hero',
      sectionType: 'HERO_CAROUSEL',
      titleEn: 'Hero carousel', titleBn: 'হিরো ক্যারোসেল',
      position: 1,
      config: { slides: heroSlides },
      isVisible: true,
    },
  });

  // DEAL_STRIP — storefront expects sectionType === 'DEAL_STRIP' and config.endsAt.
  const dealEndsAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  await prisma.cmsSection.upsert({
    where: { key: 'home-deal-strip' },
    update: {
      sectionType: 'DEAL_STRIP',
      titleEn: 'Deal strip', titleBn: 'ডিল স্ট্রিপ',
      config: { endsAt: dealEndsAt },
      isVisible: true,
    },
    create: {
      key: 'home-deal-strip',
      sectionType: 'DEAL_STRIP',
      titleEn: 'Deal strip', titleBn: 'ডিল স্ট্রিপ',
      position: 3,
      config: { endsAt: dealEndsAt },
      isVisible: true,
    },
  });

  // PROMO_TILES — reserved for future storefront wiring; harmless if unused.
  await prisma.cmsSection.upsert({
    where: { key: 'home-promo-tiles' },
    update: {
      sectionType: 'PROMO_TILES',
      titleEn: 'Promo tiles', titleBn: 'প্রোমো টাইল',
      config: {
        tiles: [
          { titleEn: 'Electronics sale', titleBn: 'ইলেকট্রনিক্স সেল', imageUrl: svgDataUrl('Promo 1') },
          { titleEn: 'Home essentials', titleBn: 'হোম এসেনশিয়াল',   imageUrl: svgDataUrl('Promo 2') },
          { titleEn: 'Fashion picks',   titleBn: 'ফ্যাশন পিক',       imageUrl: svgDataUrl('Promo 3') },
          { titleEn: 'Grocery deal',    titleBn: 'মুদি ডিল',         imageUrl: svgDataUrl('Promo 4') },
        ],
      },
      isVisible: true,
    },
    create: {
      key: 'home-promo-tiles',
      sectionType: 'PROMO_TILES',
      titleEn: 'Promo tiles', titleBn: 'প্রোমো টাইল',
      position: 4,
      config: {
        tiles: [
          { titleEn: 'Electronics sale', titleBn: 'ইলেকট্রনিক্স সেল', imageUrl: svgDataUrl('Promo 1') },
          { titleEn: 'Home essentials', titleBn: 'হোম এসেনশিয়াল',   imageUrl: svgDataUrl('Promo 2') },
          { titleEn: 'Fashion picks',   titleBn: 'ফ্যাশন পিক',       imageUrl: svgDataUrl('Promo 3') },
          { titleEn: 'Grocery deal',    titleBn: 'মুদি ডিল',         imageUrl: svgDataUrl('Promo 4') },
        ],
      },
      isVisible: true,
    },
  });
  console.log('[seed-dev] cms sections: 3 (HERO_CAROUSEL, DEAL_STRIP, PROMO_TILES)');

  // ---------------------------------------------------------
  // 4. Announcement (announcement bar)
  // ---------------------------------------------------------
  const existingAnn = await prisma.announcement.findFirst({ where: { textEn: { contains: '[PLACEHOLDER]' } } });
  if (!existingAnn) {
    await prisma.announcement.create({
      data: {
        textEn: '[PLACEHOLDER] Free delivery on orders over ৳1,500',
        textBn: '[PLACEHOLDER] ১৫০০ টাকার উপরে ফ্রি ডেলিভারি',
        bgColor: '#164561',
        textColor: '#FFFFFF',
        isActive: true,
      },
    });
  }
  console.log('[seed-dev] announcement: 1');

  // ---------------------------------------------------------
  // 5. Flash sale (24h window, 3 items)
  // ---------------------------------------------------------
  const flashSlugCandidates = ['placeholder-wireless-headphone-x200', 'placeholder-smartphone-s1', 'placeholder-cotton-shirt-classic'];
  const flashVariantIds: string[] = [];
  for (const slug of flashSlugCandidates) {
    const ids = variantsBySlug[slug] ?? [];
    if (ids[0]) flashVariantIds.push(ids[0]);
  }

  if (flashVariantIds.length > 0) {
    const existing = await prisma.flashSale.findFirst({ where: { name: '[PLACEHOLDER] Flash Sale' } });
    let flashId: string;
    if (existing) {
      flashId = existing.id;
      await prisma.flashSale.update({
        where: { id: flashId },
        data: {
          startsAt: new Date(Date.now() - 60 * 60 * 1000),
          endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isActive: true,
        },
      });
    } else {
      const created = await prisma.flashSale.create({
        data: {
          name: '[PLACEHOLDER] Flash Sale',
          description: '[PLACEHOLDER] Limited-time demo sale',
          startsAt: new Date(Date.now() - 60 * 60 * 1000),
          endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isActive: true,
        },
      });
      flashId = created.id;
    }

    for (const variantId of flashVariantIds) {
      await prisma.flashSaleItem.upsert({
        where: {
          flashSaleId_variantId: { flashSaleId: flashId, variantId },
        },
        update: {
          dealPricePoisha: 199900,
          capQuantity: 10,
        },
        create: {
          flashSaleId: flashId,
          variantId,
          dealPricePoisha: 199900,
          capQuantity: 10,
          soldQuantity: 0,
        },
      });
    }
    console.log(`[seed-dev] flash sale items: ${flashVariantIds.length}`);
  }

  // ---------------------------------------------------------
  // 6. Dev admin user (only if not exists)
  // ---------------------------------------------------------
  const adminEmail = 'admin@bluegofer.local';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('Admin123!', 12);
    await prisma.user.create({
      data: {
        phone: '8801700000000',
        email: adminEmail,
        fullName: 'Dev Admin [PLACEHOLDER]',
        passwordHash: hash,
        phoneVerifiedAt: new Date(),
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`[seed-dev] created dev admin: ${adminEmail} / Admin123!`);
  } else {
    console.log(`[seed-dev] admin already exists: ${adminEmail}`);
  }

  console.log('[seed-dev] done.');
}

main()
  .catch((e) => {
    console.error('[seed-dev] FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });