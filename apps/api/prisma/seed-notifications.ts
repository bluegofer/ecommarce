// apps/api/prisma/seed-notifications.ts
// Idempotent seed of default transactional templates (bn + en).
// Run once:  pnpm --filter @ecommarce/api exec tsx prisma/seed-notifications.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Tpl = {
  key: string;
  channel: 'SMS' | 'EMAIL' | 'PUSH';
  subjectEn?: string;
  subjectBn?: string;
  bodyEn: string;
  bodyBn: string;
};

const TEMPLATES: Tpl[] = [
  {
    key: 'order.placed',
    channel: 'SMS',
    bodyEn: 'SkyMart: order {{orderNumber}} placed. Total {{total}} BDT.',
    bodyBn: 'স্কাইমার্ট: অর্ডার {{orderNumber}} নিশ্চিত হয়েছে। মোট {{total}} টাকা।',
  },
  {
    key: 'order.confirmed',
    channel: 'SMS',
    bodyEn: 'SkyMart: order {{orderNumber}} confirmed. Total {{total}} BDT.',
    bodyBn: 'স্কাইমার্ট: অর্ডার {{orderNumber}} কনফার্ম হয়েছে। মোট {{total}} টাকা।',
  },
  {
    key: 'order.processing',
    channel: 'SMS',
    bodyEn: 'SkyMart: order {{orderNumber}} is being packed.',
    bodyBn: 'স্কাইমার্ট: অর্ডার {{orderNumber}} প্যাক করা হচ্ছে।',
  },
  {
    key: 'order.shipped',
    channel: 'SMS',
    bodyEn: 'SkyMart: order {{orderNumber}} has shipped.',
    bodyBn: 'স্কাইমার্ট: অর্ডার {{orderNumber}} পাঠানো হয়েছে।',
  },
  {
    key: 'order.delivered',
    channel: 'SMS',
    bodyEn: 'SkyMart: order {{orderNumber}} delivered. Thank you!',
    bodyBn: 'স্কাইমার্ট: অর্ডার {{orderNumber}} ডেলিভার হয়েছে। ধন্যবাদ!',
  },
  {
    key: 'order.cancelled',
    channel: 'SMS',
    bodyEn: 'SkyMart: order {{orderNumber}} was cancelled.',
    bodyBn: 'স্কাইমার্ট: অর্ডার {{orderNumber}} বাতিল হয়েছে।',
  },
  {
    key: 'cart.abandoned',
    channel: 'EMAIL',
    subjectEn: 'You left items in your SkyMart cart',
    subjectBn: 'আপনার স্কাইমার্ট কার্টে পণ্য রয়ে গেছে',
    bodyEn: 'Hi {{name}}, you have {{itemCount}} item(s) waiting. Complete your order now!',
    bodyBn: 'হ্যালো {{name}}, আপনার {{itemCount}}টি পণ্য অপেক্ষা করছে। এখনই অর্ডার সম্পন্ন করুন!',
  },
  {
    key: 'cart.abandoned_second',
    channel: 'EMAIL',
    subjectEn: 'Come back — a coupon is waiting',
    subjectBn: 'ফিরে আসুন — কুপন অপেক্ষা করছে',
    bodyEn: 'Hi {{name}}, use {{couponCode}} to save on your cart.',
    bodyBn: 'হ্যালো {{name}}, {{couponCode}} ব্যবহার করে সাশ্রয় করুন।',
  },
  {
    key: 'back_in_stock',
    channel: 'EMAIL',
    subjectEn: 'Back in stock!',
    subjectBn: 'আবার স্টকে এসেছে!',
    bodyEn: 'The item you wanted is back in stock (variant {{variantId}}).',
    bodyBn: 'আপনার কাঙ্ক্ষিত পণ্যটি আবার স্টকে এসেছে (ভ্যারিয়েন্ট {{variantId}})।',
  },
];

async function main() {
  for (const t of TEMPLATES) {
    await prisma.notificationTemplate.upsert({
      where: { key_channel: { key: t.key, channel: t.channel } },
      create: {
        key: t.key,
        channel: t.channel,
        subjectEn: t.subjectEn ?? null,
        subjectBn: t.subjectBn ?? null,
        bodyEn: t.bodyEn,
        bodyBn: t.bodyBn,
        isActive: true,
      },
      update: {},
    });
  }
  console.log(`Seeded ${TEMPLATES.length} notification templates.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });