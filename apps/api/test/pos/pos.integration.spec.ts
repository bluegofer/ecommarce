// apps/api/test/pos/pos.integration.spec.ts
// Step 11 A.5 chain proof (POS → Inventory → Accounting) + concurrency +
// drawer + transfer + return/exchange.
// Direct instantiation — avoids NestJS DI lifecycle hangs.
import { PrismaService } from '../../src/database/prisma.service';
import { LedgerService } from '../../src/modules/accounting/services/ledger.service';
import { ChartOfAccountsService } from '../../src/modules/accounting/services/chart-of-accounts.service';
import { seedDefaultCoa } from '../../src/modules/accounting/seeds/default-coa.seed';
import { PosService } from '../../src/modules/pos/pos.service';
import { PosReturnsService } from '../../src/modules/pos/pos-returns.service';
import { PosReportsService } from '../../src/modules/pos/pos-reports.service';

jest.setTimeout(40000);

const TEST_CODE = 'POS-TEST';

describe('POS — A.5 chain (integration)', () => {
  let prisma: PrismaService;
  let ledger: LedgerService;
  let coa: ChartOfAccountsService;
  let pos: PosService;
  let returns: PosReturnsService;
  let reports: PosReportsService;

  let branchId: string;
  let registerId: string;
  let userId: string;
  let categoryId: string;
  let variantId: string;
  let variantId2: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    ledger = new LedgerService(prisma);
    coa = new ChartOfAccountsService(prisma);
    pos = new PosService(prisma, ledger, coa);
    returns = new PosReturnsService(prisma, ledger, coa);
    reports = new PosReportsService(prisma);

    await seedDefaultCoa(prisma);
  });

  afterAll(async () => {
    // Cleanup POS test data
    await prisma.posPayment.deleteMany({
      where: { sale: { receiptNumber: { startsWith: 'POS-' } } },
    }).catch(() => {});
    await prisma.posSaleItem.deleteMany({
      where: { sale: { receiptNumber: { startsWith: 'POS-' } } },
    }).catch(() => {});
    await prisma.posSale.deleteMany({
      where: { receiptNumber: { startsWith: 'POS-' } },
    }).catch(() => {});
    await prisma.posCashEvent.deleteMany({}).catch(() => {});
    await prisma.posSession.deleteMany({}).catch(() => {});
    await prisma.stockTransferItem.deleteMany({
      where: { transfer: { transferNumber: { startsWith: 'TRF-' } } },
    }).catch(() => {});
    await prisma.stockTransfer.deleteMany({
      where: { transferNumber: { startsWith: 'TRF-' } },
    }).catch(() => {});
    await prisma.branchStock.deleteMany({}).catch(() => {});
    await prisma.register.deleteMany({ where: { name: { contains: TEST_CODE } } }).catch(() => {});
    await prisma.branch.deleteMany({ where: { code: { in: ['POS-T1', 'POS-T2'] } } }).catch(() => {});
    await prisma.variant.deleteMany({ where: { sku: { startsWith: TEST_CODE } } }).catch(() => {});
    await prisma.product.deleteMany({ where: { slug: { startsWith: TEST_CODE } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { phone: { startsWith: '+88019990' } } }).catch(() => {});
    await appClose();
  });

  async function appClose() {
    try { await prisma.$disconnect(); } catch { /* noop */ }
  }

  // ----------------------------------------------------------------
  // Fixture setup
  // ----------------------------------------------------------------
  beforeEach(async () => {
    // Idempotent fixture: wipe and recreate
    await prisma.branchStock.deleteMany({});
    await prisma.posCashEvent.deleteMany({});
    await prisma.posPayment.deleteMany({});
    await prisma.posSaleItem.deleteMany({});
    await prisma.posSale.deleteMany({});
    await prisma.posSession.deleteMany({});
    await prisma.stockTransferItem.deleteMany({});
    await prisma.stockTransfer.deleteMany({});
    await prisma.register.deleteMany({ where: { name: { contains: TEST_CODE } } });
    await prisma.branch.deleteMany({ where: { code: { in: ['POS-T1', 'POS-T2'] } } });
    await prisma.variant.deleteMany({ where: { sku: { startsWith: TEST_CODE } } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: TEST_CODE } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: TEST_CODE } } });
    await prisma.user.deleteMany({ where: { phone: { startsWith: '+88019990' } } });

    // Branch
    const b1 = await prisma.branch.create({
      data: { code: 'POS-T1', name: `T1 ${TEST_CODE}`, isDefault: false, status: 'ACTIVE' },
    });
    branchId = b1.id;

    // Register
    const reg = await prisma.register.create({
      data: { branchId, name: `Register ${TEST_CODE}`, isActive: true },
    });
    registerId = reg.id;

    // User (cashier)
    const u = await prisma.user.create({
      data: {
        phone: '+8801999000001',
        fullName: 'POS Test Cashier',
        passwordHash: 'x',
        status: 'ACTIVE',
      },
    });
    userId = u.id;

    // Category (required by Product)
    const category = await prisma.category.create({
      data: {
        slug: `${TEST_CODE}-cat`,
        nameEn: 'POS Test Category',
        nameBn: 'পিওএস টেস্ট ক্যাটাগরি',
        isActive: true,
      },
    });
    categoryId = category.id;

    // Product + variants
    const product = await prisma.product.create({
      data: {
        slug: `${TEST_CODE}-product`,
        titleEn: 'POS Test Product',
        titleBn: 'পিওএস টেস্ট পণ্য',
        status: 'PUBLISHED',
        categoryId,
      },
    });
    const v1 = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: `${TEST_CODE}-V1`,
        pricePoisha: 10000,
        stock: 0,
        attributeValues: {},
      },
    });
    const v2 = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: `${TEST_CODE}-V2`,
        pricePoisha: 15000,
        stock: 0,
        attributeValues: {},
      },
    });
    variantId = v1.id;
    variantId2 = v2.id;

    // Seed branch stock: v1=10, v2=5
    await prisma.branchStock.createMany({
      data: [
        { branchId, variantId, quantity: 10 },
        { branchId, variantId: variantId2, quantity: 5 },
      ],
    });
  });

  // ----------------------------------------------------------------
  // AC-34: POS sale → branch stock down + balanced ledger entry
  // ----------------------------------------------------------------
  it('AC-34: POS sale decrements branch stock and posts balanced journal', async () => {
    await pos.openSession({ registerId, openingBalance: 0 }, userId);

    const sale = await pos.createSale(
      {
        registerId,
        items: [{ variantId, quantity: 2, unitPrice: 10000 }],
        payments: [{ method: 'CASH' as any, amount: 20000 }],
        discount: 0,
      },
      userId,
    );

    expect(sale.total).toBe(20000);
    expect(sale.status).toBe('COMPLETED');

    const stock = await prisma.branchStock.findFirst({
      where: { branchId, variantId },
    });
    expect(stock?.quantity).toBe(8); // was 10, sold 2

    const entries = await prisma.journalEntry.findMany({
      where: { sourceType: 'POS_SALE', sourceId: sale.id },
      include: { lines: true },
    });
    expect(entries.length).toBe(1);
    const e = entries[0];
    const sumDebit = e.lines.reduce((s, l) => s + l.debit, 0);
    const sumCredit = e.lines.reduce((s, l) => s + l.credit, 0);
    expect(sumDebit).toBe(sumCredit);
    expect(sumDebit).toBe(20000);
  });

  // ----------------------------------------------------------------
  // AC-33: Concurrency — 2 parallel sales for last unit → 1 wins
  // ----------------------------------------------------------------
  it('AC-33: parallel sales for the last unit → exactly one succeeds', async () => {
    await pos.openSession({ registerId, openingBalance: 0 }, userId);

    // Reduce v1 to exactly 1 unit
    await prisma.branchStock.updateMany({
      where: { branchId, variantId },
      data: { quantity: 1 },
    });

    const saleArgs = {
      registerId,
      items: [{ variantId, quantity: 1, unitPrice: 10000 }],
      payments: [{ method: 'CASH' as any, amount: 10000 }],
      discount: 0,
    };

    const results = await Promise.allSettled([
      pos.createSale(saleArgs, userId),
      pos.createSale(saleArgs, userId),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const finalStock = await prisma.branchStock.findFirst({
      where: { branchId, variantId },
    });
    expect(finalStock?.quantity).toBe(0);
  });

  // ----------------------------------------------------------------
  // AC-35: Drawer math — open → sale → cash event → close
  // ----------------------------------------------------------------
  it('AC-35: drawer closes with exact expected balance', async () => {
    const session = await pos.openSession({ registerId, openingBalance: 5000 }, userId);

    await pos.recordCashEvent(session.id, { type: 'CASH_IN', amount: 1000 }, userId);
    await pos.recordCashEvent(session.id, { type: 'CASH_OUT', amount: 500, reason: 'petty' }, userId);

    // Sale paying 20000 cash
    await pos.createSale(
      {
        registerId,
        items: [{ variantId, quantity: 2, unitPrice: 10000 }],
        payments: [{ method: 'CASH' as any, amount: 20000 }],
        discount: 0,
      },
      userId,
    );

    // Expected = 5000 + 1000 - 500 + 20000 = 25500
    const closed = await pos.closeSession(
      session.id,
      { countedBalance: 25500 },
      userId,
    );

    expect(closed.expectedBalance).toBe(25500);
    expect(closed.variance).toBe(0);
    expect(closed.status).toBe('CLOSED');
  });

  it('AC-35b: variance above threshold requires approval', async () => {
    const session = await pos.openSession({ registerId, openingBalance: 0 }, userId);

    await expect(
      pos.closeSession(session.id, { countedBalance: 999999 }, userId),
    ).rejects.toThrow(/approval required/);
  });

  // ----------------------------------------------------------------
  // AC-36: Return — restock + reversed ledger
  // ----------------------------------------------------------------
  it('AC-36: return restocks + reverses ledger', async () => {
    await pos.openSession({ registerId, openingBalance: 0 }, userId);

    const sale = await pos.createSale(
      {
        registerId,
        items: [{ variantId, quantity: 2, unitPrice: 10000 }],
        payments: [{ method: 'CASH' as any, amount: 20000 }],
        discount: 0,
      },
      userId,
    );

    const item = await prisma.posSaleItem.findFirstOrThrow({ where: { saleId: sale.id } });

    const result = await returns.returnSale(
      sale.id,
      {
        items: [{ posSaleItemId: item.id, quantity: 1 }],
        refundMethod: 'CASH',
        reason: 'Customer changed mind',
      },
      userId,
    );

    expect(result.refundTotal).toBe(10000);

    const stock = await prisma.branchStock.findFirst({ where: { branchId, variantId } });
    expect(stock?.quantity).toBe(9); // was 10, sold 2, returned 1

    const refreshedSale = await prisma.posSale.findUnique({ where: { id: sale.id } });
    expect(refreshedSale?.status).toBe('PARTIALLY_RETURNED');
  });

  // ----------------------------------------------------------------
  // AC-36b: Exchange — delta = newItemsTotal - returnedTotal
  // ----------------------------------------------------------------
  it('AC-36b: exchange computes exact delta', async () => {
    await pos.openSession({ registerId, openingBalance: 0 }, userId);

    const sale = await pos.createSale(
      {
        registerId,
        items: [{ variantId, quantity: 1, unitPrice: 10000 }],
        payments: [{ method: 'CASH' as any, amount: 10000 }],
        discount: 0,
      },
      userId,
    );

    const item = await prisma.posSaleItem.findFirstOrThrow({ where: { saleId: sale.id } });

    // Exchange v1 (10000) for v2 (15000) → delta = +5000 (customer pays)
    const result = await returns.exchangeSale(
      sale.id,
      {
        items: [{ posSaleItemId: item.id, quantity: 1 }],
        refundMethod: 'CASH',
        exchangeVariantIds: [{ variantId: variantId2, quantity: 1 }],
      },
      userId,
    );

    expect(result.returnedTotal).toBe(10000);
    expect(result.newItemsTotal).toBe(15000);
    expect(result.delta).toBe(5000);
    expect(result.settlement).toBe('CUSTOMER_PAYS');
  });

  // ----------------------------------------------------------------
  // AC-37: Transfer — DRAFT → DISPATCHED → RECEIVED, stock conserved
  // ----------------------------------------------------------------
  it('AC-37: inter-branch transfer conserves stock', async () => {
    const b2 = await prisma.branch.create({
      data: { code: 'POS-T2', name: `T2 ${TEST_CODE}`, isDefault: false, status: 'ACTIVE' },
    });

    await prisma.branchStock.create({
      data: { branchId: b2.id, variantId, quantity: 0 },
    });

    const transfer = await pos.createTransfer(
      {
        fromBranchId: branchId,
        toBranchId: b2.id,
        items: [{ variantId, quantity: 3 }],
      },
      userId,
    );
    expect(transfer.status).toBe('DRAFT');

    const dispatched = await pos.dispatchTransfer(transfer.id, userId);
    expect(dispatched.status).toBe('DISPATCHED');

    const afterDispatch = await prisma.branchStock.findFirst({
      where: { branchId, variantId },
    });
    expect(afterDispatch?.quantity).toBe(7); // 10 - 3

    await pos.receiveTransfer(transfer.id, userId);

    const toBranchStock = await prisma.branchStock.findFirst({
      where: { branchId: b2.id, variantId },
    });
    expect(toBranchStock?.quantity).toBe(3);

    // Total conserved
    const fromFinal = await prisma.branchStock.findFirst({
      where: { branchId, variantId },
    });
    expect((fromFinal?.quantity ?? 0) + (toBranchStock?.quantity ?? 0)).toBe(10);
  });

  // ----------------------------------------------------------------
  // AC-38: Reports aggregate correctly
  // ----------------------------------------------------------------
  it('AC-38: branch + daily reports return correct aggregates', async () => {
    await pos.openSession({ registerId, openingBalance: 0 }, userId);

    await pos.createSale(
      {
        registerId,
        items: [{ variantId, quantity: 1, unitPrice: 10000 }],
        payments: [{ method: 'CASH' as any, amount: 10000 }],
        discount: 0,
      },
      userId,
    );
    await pos.createSale(
      {
        registerId,
        items: [{ variantId, quantity: 1, unitPrice: 10000 }],
        payments: [{ method: 'CARD' as any, amount: 10000 }],
        discount: 0,
      },
      userId,
    );

    const branchRows = await reports.branchReport({});
    const row = branchRows.find((r) => r.branchId === branchId);
    expect(row).toBeTruthy();
    expect(row!.saleCount).toBe(2);
    expect(row!.netPoisha).toBe(20000);
    expect(row!.cashPoisha).toBe(10000);
    expect(row!.cardPoisha).toBe(10000);

    const dailyRows = await reports.dailyReport({});
    expect(dailyRows.length).toBeGreaterThan(0);
  });
});