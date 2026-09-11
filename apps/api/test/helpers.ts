import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';

export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
  redis: RedisService;
}> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();

  const prisma = app.get(PrismaService);
  const redis = app.get(RedisService);
  return { app, prisma, redis };
}

export async function cleanDatabase(
  prisma: PrismaService,
  redis?: RedisService,
): Promise<void> {
  if (redis) {
    try {
      await redis.client.flushdb();
    } catch {
      /* ignore */
    }
  }

  const deletions: Array<[string, () => Promise<unknown>]> = [
    // Step 5 (children first)
    ['notificationLog', () => prisma.notificationLog.deleteMany()],
    ['notificationTemplate', () => prisma.notificationTemplate.deleteMany()],
    ['backInStockSubscription', () => prisma.backInStockSubscription.deleteMany()],
    ['orderStatusHistory', () => prisma.orderStatusHistory.deleteMany()],
    ['orderNote', () => prisma.orderNote.deleteMany()],
    ['payment', () => prisma.payment.deleteMany()],
    ['shipment', () => prisma.shipment.deleteMany()],
    ['orderItem', () => prisma.orderItem.deleteMany()],
    ['order', () => prisma.order.deleteMany()],
    ['cartItem', () => prisma.cartItem.deleteMany()],
    ['cart', () => prisma.cart.deleteMany()],
    ['customerNote', () => prisma.customerNote.deleteMany()],
    ['address', () => prisma.address.deleteMany()],
    ['customer', () => prisma.customer.deleteMany()],
    ['segment', () => prisma.segment.deleteMany()],

    // Step 4
    ['couponRedemption', () => prisma.couponRedemption.deleteMany()],
    ['coupon', () => prisma.coupon.deleteMany()],
    ['flashSaleItem', () => prisma.flashSaleItem.deleteMany()],
    ['flashSale', () => prisma.flashSale.deleteMany()],
    ['automaticDiscount', () => prisma.automaticDiscount.deleteMany()],
    ['cmsPageRevision', () => prisma.cmsPageRevision.deleteMany()],
    ['cmsPage', () => prisma.cmsPage.deleteMany()],
    ['cmsMenuItem', () => prisma.cmsMenuItem.deleteMany()],
    ['cmsMenu', () => prisma.cmsMenu.deleteMany()],
    ['cmsSection', () => prisma.cmsSection.deleteMany()],
    ['announcement', () => prisma.announcement.deleteMany()],
    ['popup', () => prisma.popup.deleteMany()],
    ['mediaLibraryItem', () => prisma.mediaLibraryItem.deleteMany()],
    ['contactMessage', () => prisma.contactMessage.deleteMany()],

    // Step 3
    ['inventoryAdjustment', () => prisma.inventoryAdjustment.deleteMany()],
    ['productAttributeValue', () => prisma.productAttributeValue.deleteMany()],
    ['productMedia', () => prisma.productMedia.deleteMany()],
    ['variant', () => prisma.variant.deleteMany()],
    ['product', () => prisma.product.deleteMany()],
    ['categoryAttribute', () => prisma.categoryAttribute.deleteMany()],
    ['attribute', () => prisma.attribute.deleteMany()],
    ['category', () => prisma.category.deleteMany()],
    ['warehouse', () => prisma.warehouse.deleteMany()],
    ['slugRedirect', () => prisma.slugRedirect.deleteMany()],

    // Step 2
    ['idempotencyKey', () => prisma.idempotencyKey.deleteMany()],
    ['outbox', () => prisma.outbox.deleteMany()],
    ['auditLog', () => prisma.auditLog.deleteMany()],
    ['refreshToken', () => prisma.refreshToken.deleteMany()],
    ['userRole', () => prisma.userRole.deleteMany()],
    ['totpSecret', () => prisma.totpSecret.deleteMany()],
    ['notificationPreference', () => prisma.notificationPreference.deleteMany()],
    ['user', () => prisma.user.deleteMany()],
    ['rolePermission', () => prisma.rolePermission.deleteMany()],
    ['permission', () => prisma.permission.deleteMany()],
    ['role', () => prisma.role.deleteMany()],
  ];

  for (const [name, fn] of deletions) {
    try {
      await fn();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`cleanDatabase failed on ${name}:`, err);
      throw err;
    }
  }
}

export function randomPhone(): string {
  const operator = 3 + Math.floor(Math.random() * 7);
  const rest = Math.floor(10000000 + Math.random() * 90000000);
  return `+8801${operator}${rest.toString().slice(0, 8)}`;
}

export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}