// apps/api/test/accounting/ledger.integration.spec.ts
// Direct instantiation (no NestJS TestingModule) — avoids DI lifecycle hangs.
// Proves: balanced POSTED succeeds, unbalanced is rejected at service layer,
// draft flow updates balances only on post.
import { PrismaService } from '../../src/database/prisma.service';
import { LedgerService } from '../../src/modules/accounting/services/ledger.service';
import { ChartOfAccountsService } from '../../src/modules/accounting/services/chart-of-accounts.service';
import { seedDefaultCoa } from '../../src/modules/accounting/seeds/default-coa.seed';

jest.setTimeout(20000);

describe('Accounting — double-entry ledger (integration)', () => {
  let prisma: PrismaService;
  let ledger: LedgerService;
  let coa: ChartOfAccountsService;
  let cashId: string;
  let salesId: string;

  beforeAll(async () => {
    console.log('>>> [1] new PrismaService');
    prisma = new PrismaService();
    console.log('>>> [2] $connect');
    await prisma.$connect();
    console.log('>>> [3] connected');
    ledger = new LedgerService(prisma);
    coa = new ChartOfAccountsService(prisma);
    console.log('>>> [4] seeding COA');
    await seedDefaultCoa(prisma);
    console.log('>>> [5] fetching cash/sales ledgers');
    const cash = await prisma.ledgerAccount.findUnique({ where: { code: '1000-CASH' } });
    const sales = await prisma.ledgerAccount.findUnique({ where: { code: '4000-SALES' } });
    if (!cash || !sales) throw new Error('Default COA seed missing cash/sales');
    cashId = cash.id;
    salesId = sales.id;
    console.log('>>> [6] beforeAll done');
  });

  afterAll(async () => {
    if (!prisma) return;
    try {
      const entries = await prisma.journalEntry.findMany({
        where: { description: { contains: 'INTEGRATION-TEST' } },
      });
      const ids = entries.map((e) => e.id);
      if (ids.length) {
        await prisma.journalLine.deleteMany({ where: { journalEntryId: { in: ids } } });
        await prisma.journalEntry.deleteMany({ where: { id: { in: ids } } });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  it('accepts a balanced POSTED entry and updates ledger balances', async () => {
    const cashBefore = (await prisma.ledgerAccount.findUnique({ where: { id: cashId } }))!.currentBalance;
    const salesBefore = (await prisma.ledgerAccount.findUnique({ where: { id: salesId } }))!.currentBalance;

    const entry = await ledger.postEntry(
      {
        entryDate: new Date().toISOString(),
        description: 'INTEGRATION-TEST balanced entry',
        lines: [
          { ledgerAccountId: cashId, debit: 5000, credit: 0 },
          { ledgerAccountId: salesId, debit: 0, credit: 5000 },
        ],
      },
      { status: 'POSTED' },
    );

    expect(entry.status).toBe('POSTED');
    expect(entry.totalDebit).toBe(5000);
    expect(entry.totalCredit).toBe(5000);

    const cashAfter = (await prisma.ledgerAccount.findUnique({ where: { id: cashId } }))!.currentBalance;
    const salesAfter = (await prisma.ledgerAccount.findUnique({ where: { id: salesId } }))!.currentBalance;

    expect(cashAfter - cashBefore).toBe(5000);
    expect(salesAfter - salesBefore).toBe(-5000);
  });

  it('rejects an unbalanced entry with a clear error', async () => {
    await expect(
      ledger.postEntry({
        entryDate: new Date().toISOString(),
        description: 'INTEGRATION-TEST unbalanced',
        lines: [
          { ledgerAccountId: cashId, debit: 10000, credit: 0 },
          { ledgerAccountId: salesId, debit: 0, credit: 5000 },
        ],
      }),
    ).rejects.toThrow(/out of balance/i);
  });

  it('creates DRAFT entries without posting balances; posting later balances them', async () => {
    const cashBefore = (await prisma.ledgerAccount.findUnique({ where: { id: cashId } }))!.currentBalance;

    const draft = await ledger.postEntry(
      {
        entryDate: new Date().toISOString(),
        description: 'INTEGRATION-TEST draft flow',
        lines: [
          { ledgerAccountId: cashId, debit: 700, credit: 0 },
          { ledgerAccountId: salesId, debit: 0, credit: 700 },
        ],
      },
      { status: 'DRAFT' },
    );

    const cashDuringDraft = (await prisma.ledgerAccount.findUnique({ where: { id: cashId } }))!.currentBalance;
    expect(cashDuringDraft).toBe(cashBefore);

    const posted = await ledger.postDraft(draft.id);
    expect(posted.status).toBe('POSTED');

    const cashAfterPost = (await prisma.ledgerAccount.findUnique({ where: { id: cashId } }))!.currentBalance;
    expect(cashAfterPost - cashBefore).toBe(700);
  });
});