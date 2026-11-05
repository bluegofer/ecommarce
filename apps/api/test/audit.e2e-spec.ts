import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';
import { createTestApp, cleanDatabase, randomPhone } from './helpers';

/**
 * AC-46: a mutating request writes an audit_log row.
 */
describe('Audit trail (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    prisma = ctx.prisma;
    redis = ctx.redis;
  });

  beforeEach(async () => {
    await cleanDatabase(prisma, redis);
  });

  afterAll(async () => {
    await cleanDatabase(prisma, redis);
    await app.close();
  });

  it('writes an audit_log row after POST /auth/register', async () => {
    const phone = randomPhone();
    const http = request(app.getHttpServer());

    const before = await prisma.auditLog.count();

    const reg = await http
      .post('/api/v1/auth/register')
      .send({ phone, fullName: 'Audit Test', password: 'TestPass123!' });
    expect(reg.status).toBe(201);

    // Audit is async; poll briefly
    let after = before;
    for (let i = 0; i < 20; i++) {
      after = await prisma.auditLog.count();
      if (after > before) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    expect(after).toBeGreaterThan(before);

    const row = await prisma.auditLog.findFirst({
      where: { action: { contains: '/auth/register' } },
      orderBy: { createdAt: 'desc' },
    });
    expect(row).not.toBeNull();
    expect(row?.entityType).toBe('auth');
  }, 30000);
});