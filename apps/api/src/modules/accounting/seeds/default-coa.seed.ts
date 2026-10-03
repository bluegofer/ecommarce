// packages/api/src/modules/accounting/seeds/default-coa.seed.ts
// Idempotent COA + LedgerAccount seed (upsert by code).
import { PrismaClient } from '@prisma/client';

interface CoaSeed {
  coaCode: string;
  coaName: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  normalBalance: 'DEBIT' | 'CREDIT';
  ledgerCode: string;
  ledgerName: string;
  kind?: 'CASH' | 'BANK' | 'MFS';
}

export const DEFAULT_COA: CoaSeed[] = [
  { coaCode: '1000', coaName: 'Cash',                type: 'ASSET',   normalBalance: 'DEBIT',  ledgerCode: '1000-CASH',     ledgerName: 'Cash in Hand',       kind: 'CASH' },
  { coaCode: '1010', coaName: 'Bank',                type: 'ASSET',   normalBalance: 'DEBIT',  ledgerCode: '1010-BANK',     ledgerName: 'Bank Account',       kind: 'BANK' },
  { coaCode: '1020', coaName: 'Mobile Wallet (MFS)', type: 'ASSET',   normalBalance: 'DEBIT',  ledgerCode: '1020-MFS',      ledgerName: 'MFS Wallet',         kind: 'MFS'  },
  { coaCode: '1100', coaName: 'Accounts Receivable', type: 'ASSET',   normalBalance: 'DEBIT',  ledgerCode: '1100-AR',       ledgerName: 'Customer Receivables' },
  { coaCode: '1200', coaName: 'Inventory',           type: 'ASSET',   normalBalance: 'DEBIT',  ledgerCode: '1200-INV',      ledgerName: 'Inventory' },
  { coaCode: '2000', coaName: 'Accounts Payable',    type: 'LIABILITY', normalBalance: 'CREDIT', ledgerCode: '2000-AP',     ledgerName: 'Supplier Payables' },
  { coaCode: '3000', coaName: 'Owner Equity',        type: 'EQUITY',  normalBalance: 'CREDIT', ledgerCode: '3000-EQUITY',   ledgerName: 'Owner Equity' },
  { coaCode: '4000', coaName: 'Sales Revenue',       type: 'REVENUE', normalBalance: 'CREDIT', ledgerCode: '4000-SALES',    ledgerName: 'Product Sales' },
  { coaCode: '5000', coaName: 'Cost of Goods Sold',  type: 'EXPENSE', normalBalance: 'DEBIT',  ledgerCode: '5000-COGS',     ledgerName: 'Cost of Goods Sold' },
  { coaCode: '5100', coaName: 'Salaries & Wages',    type: 'EXPENSE', normalBalance: 'DEBIT',  ledgerCode: '5100-SALARY',   ledgerName: 'Salaries & Wages' },
  { coaCode: '5110', coaName: 'Rent',                type: 'EXPENSE', normalBalance: 'DEBIT',  ledgerCode: '5110-RENT',     ledgerName: 'Rent Expense' },
  { coaCode: '5120', coaName: 'Utilities',           type: 'EXPENSE', normalBalance: 'DEBIT',  ledgerCode: '5120-UTIL',     ledgerName: 'Utilities' },
  { coaCode: '5130', coaName: 'Delivery & Logistics', type: 'EXPENSE', normalBalance: 'DEBIT', ledgerCode: '5130-DELIVERY', ledgerName: 'Delivery & Logistics' },
  { coaCode: '5900', coaName: 'Other Expenses',      type: 'EXPENSE', normalBalance: 'DEBIT',  ledgerCode: '5900-OTHER',    ledgerName: 'Other Expenses' },
];

export async function seedDefaultCoa(prisma: PrismaClient): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const row of DEFAULT_COA) {
    const existingCoa = await prisma.chartOfAccounts.findUnique({ where: { code: row.coaCode } });
    let coaId: string;
    if (existingCoa) {
      coaId = existingCoa.id;
      skipped++;
    } else {
      const createdCoa = await prisma.chartOfAccounts.create({
        data: {
          code: row.coaCode,
          name: row.coaName,
          type: row.type,
          normalBalance: row.normalBalance,
          isLeaf: true,
        },
      });
      coaId = createdCoa.id;
      created++;
    }

    const existingLedger = await prisma.ledgerAccount.findUnique({
      where: { code: row.ledgerCode },
    });
    if (!existingLedger) {
      await prisma.ledgerAccount.create({
        data: {
          code: row.ledgerCode,
          name: row.ledgerName,
          accountId: coaId,
          kind: row.kind,
          openingBalance: 0,
          currentBalance: 0,
        },
      });
    }
  }

  return { created, skipped };
}