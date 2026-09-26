import { Controller, INestApplication, Post, UseInterceptors } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'crypto';

import { DatabaseModule } from '../src/database/database.module';
import { PrismaService } from '../src/database/prisma.service';
import { IdempotencyInterceptor } from '../src/common/interceptors/idempotency.interceptor';
import { Public } from '../src/common/decorators/public.decorator';
import { cleanDatabase } from './helpers';

/**
 * AC-47: same Idempotency-Key -> same response, single effect.
 * Uses an in-test controller so we count handler executions directly.
 */
let executionCount = 0;

@Controller('idempotent-demo')
@UseInterceptors(IdempotencyInterceptor)
class IdempotentDemoController {
  @Public()
  @Post('charge')
  charge() {
    executionCount++;
    return { ok: true, chargeId: 'fixed-for-test', executions: executionCount };
  }
}

describe('Idempotency (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule],
      controllers: [IdempotentDemoController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    executionCount = 0;
    await prisma.idempotencyKey.deleteMany();
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  it('returns the stored response on replay without re-executing', async () => {
    const key = randomUUID();
    const http = request(app.getHttpServer());

    const first = await http
      .post('/api/v1/idempotent-demo/charge')
      .set('Idempotency-Key', key)
      .expect(201);

    const second = await http
      .post('/api/v1/idempotent-demo/charge')
      .set('Idempotency-Key', key)
      .expect(201);

    expect(second.body).toEqual(first.body);
    expect(executionCount).toBe(1);
  });

  it('rejects reuse of a key with a different payload', async () => {
    const key = randomUUID();
    const http = request(app.getHttpServer());

    await http
      .post('/api/v1/idempotent-demo/charge')
      .set('Idempotency-Key', key)
      .send({ amount: 100 })
      .expect(201);

    await http
      .post('/api/v1/idempotent-demo/charge')
      .set('Idempotency-Key', key)
      .send({ amount: 200 })
      .expect(400);
  });
});