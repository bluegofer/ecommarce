import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DatabaseModule } from '../src/database/database.module';
import { PrismaService } from '../src/database/prisma.service';
import { OutboxPublisher } from '../src/modules/jobs/outbox.publisher';

/**
 * AC-48: an event written to the outbox survives a crash between write and
 * publish, and is delivered by the next publisher cycle.
 */
describe('Outbox (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let publisher: OutboxPublisher;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [OutboxPublisher],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    publisher = app.get(OutboxPublisher);
  });

  beforeEach(async () => {
    await prisma.outbox.deleteMany();
  });

  afterAll(async () => {
    await prisma.outbox.deleteMany();
    await app.close();
  });

  it('publishes a pending event (crash-heal)', async () => {
    await prisma.outbox.create({
      data: {
        eventType: 'order.placed',
        aggregateType: 'order',
        aggregateId: 'order-1',
        payload: { orderId: 'order-1' },
        status: 'PENDING',
        availableAt: new Date(Date.now() - 1000),
      },
    });

    const pending = await prisma.outbox.findMany({ where: { status: 'PENDING' } });
    expect(pending.length).toBe(1);

    const processed = await publisher.tick();
    expect(processed).toBe(1);

    const published = await prisma.outbox.findMany({ where: { status: 'PUBLISHED' } });
    expect(published.length).toBe(1);

    const first = published[0];
    expect(first).toBeDefined();
    if (first) {
      expect(first.publishedAt).not.toBeNull();
    }
  }, 30000);

  it('does not process events scheduled for the future', async () => {
    await prisma.outbox.create({
      data: {
        eventType: 'order.placed',
        aggregateType: 'order',
        aggregateId: 'order-future',
        payload: { orderId: 'order-future' },
        status: 'PENDING',
        availableAt: new Date(Date.now() + 60_000),
      },
    });

    const processed = await publisher.tick();
    expect(processed).toBe(0);

    const stillPending = await prisma.outbox.findMany({ where: { status: 'PENDING' } });
    expect(stillPending.length).toBe(1);
  }, 30000);
});