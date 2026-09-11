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
      // ignore
    }
  }

  const deletions: Array<[string, () => Promise<unknown>]> = [
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

/**
 * Generate a valid BD phone in +8801[3-9]XXXXXXXX format.
 * RegisterDto regex: /^\+8801[3-9]\d{8}$/
 *  - "+8801" prefix
 *  - second digit after 1 : 3-9  (operator code)
 *  - then 8 more digits
 */
export function randomPhone(): string {
  const operator = 3 + Math.floor(Math.random() * 7); // 3..9
  const rest = Math.floor(10000000 + Math.random() * 90000000); // 8 digits
  return `+8801${operator}${rest.toString().slice(0, 8)}`;
}