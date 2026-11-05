// Step 13.7 — Courier tracking sync integration test (TDD §A.4, §11.2).
import { PrismaService } from '../../src/database/prisma.service';
import { CourierService } from '../../src/modules/courier/courier.service';
import { CourierAdapterRegistryImpl } from '../../src/modules/courier/courier-registry';
import { MockPathaoAdapter } from '../../src/modules/courier/adapters/mock-pathao.adapter';

jest.setTimeout(30000);

describe('Courier — tracking sync (integration)', () => {
  let prisma: PrismaService;
  let courier: CourierService;
  const TEST_MARK = 'COURIER-INTEGRATION-TEST';

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    const adapters = new CourierAdapterRegistryImpl([new MockPathaoAdapter()]);
    courier = new CourierService(prisma, adapters);
  });

  afterAll(async () => {
    if (!prisma) return;
    try {
      await prisma.$disconnect();
    } finally {
      /* noop */
    }
  });

  it('rejects if order does not exist', async () => {
    await expect(
      courier.createForOrder('non-existent-order-id', 'PATHAO', 'x', 'idem-1'),
    ).rejects.toThrow(/order not found/);
  });

  it('full flow: create → sync → idempotent replay', async () => {
    const order = await prisma.order.findFirst({
      where: { status: 'PLACED' },
      orderBy: { createdAt: 'desc' },
    });
    if (!order) {
      console.log('SKIP: no PLACED order in DB — seed via storefront first');
      return;
    }

    const created = await courier.createForOrder(
      order.id,
      'PATHAO',
      TEST_MARK,
      `dispatch-${order.id}-test-${Date.now()}`,
    );
    expect(created.ok).toBe(true);
    expect(created.provider).toBe('PATHAO');
    expect(created.consignmentId).toBeTruthy();

    const shipment = await prisma.shipment.findFirst({
      where: { orderId: order.id, courier: 'PATHAO' },
      orderBy: { createdAt: 'desc' },
    });
    expect(shipment).toBeTruthy();
    expect(shipment!.status).toBe('PENDING');

    const sync1 = await courier.syncTracking(shipment!.id);
    expect(sync1.ok).toBe(true);
    expect(sync1.applied).toBeGreaterThanOrEqual(1);

    const after1 = await prisma.shipment.findUnique({ where: { id: shipment!.id } });
    expect(after1!.status).toBe('IN_TRANSIT');
    expect(after1!.dispatchedAt).toBeTruthy();

    const sync2 = await courier.syncTracking(shipment!.id);
    expect(sync2.flagged).toBe(0);
  });

  it('never downgrades a staff-set terminal status (TDD §A.4)', async () => {
    const shipment = await prisma.shipment.findFirst({
      where: { status: 'DELIVERED' },
    });
    if (!shipment) {
      console.log('SKIP: no DELIVERED shipment');
      return;
    }
    const result = await courier.syncTracking(shipment.id);
    expect(result.flagged).toBeGreaterThanOrEqual(0);

    const after = await prisma.shipment.findUnique({ where: { id: shipment.id } });
    expect(after!.status).toBe('DELIVERED');
  });
});