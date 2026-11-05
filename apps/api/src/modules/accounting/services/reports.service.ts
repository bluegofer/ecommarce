// packages/api/src/modules/accounting/services/reports.service.ts
// Financial reports: P&L, Balance Sheet, Cash Flow.
// All money = integer poisha. Values derived from journal_lines + COA type.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type {
  ProfitAndLossReport,
  ProfitAndLossRow,
  BalanceSheetReport,
  BalanceSheetRow,
  CashFlowReport,
  CashFlowRow,
} from '@ecommarce/types';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * P&L over [from, to]: sums REVENUE and EXPENSE lines from POSTED
   * journal entries. Revenue normalBalance=CREDIT -> net = credit - debit.
   * Expense normalBalance=DEBIT -> net = debit - credit.
   */
  async profitAndLoss(from: string, to: string): Promise<ProfitAndLossReport> {
    const rows = await this.prisma.$queryRaw<
      { coaCode: string; coaName: string; coaType: string; totalDebit: bigint; totalCredit: bigint }[]
    >`
      SELECT coa.code AS "coaCode", coa.name AS "coaName", coa."type"::text AS "coaType",
             COALESCE(SUM(jl.debit), 0)::bigint AS "totalDebit",
             COALESCE(SUM(jl.credit), 0)::bigint AS "totalCredit"
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl."journalEntryId"
      JOIN ledger_accounts la ON la.id = jl."ledgerAccountId"
      JOIN chart_of_accounts coa ON coa.id = la."accountId"
      WHERE je.status = 'POSTED'
        AND je."entryDate" >= ${new Date(from)}
        AND je."entryDate" <= ${new Date(to)}
        AND coa."type" IN ('REVENUE','EXPENSE')
      GROUP BY coa.code, coa.name, coa."type"
      ORDER BY coa.code ASC
    `;

    const revenue: ProfitAndLossRow[] = [];
    const expenses: ProfitAndLossRow[] = [];
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const r of rows) {
      const debit = Number(r.totalDebit);
      const credit = Number(r.totalCredit);
      if (r.coaType === 'REVENUE') {
        const net = credit - debit;
        revenue.push({ accountCode: r.coaCode, accountName: r.coaName, amount: net });
        totalRevenue += net;
      } else {
        const net = debit - credit;
        expenses.push({ accountCode: r.coaCode, accountName: r.coaName, amount: net });
        totalExpenses += net;
      }
    }

    const grossProfit = totalRevenue - totalExpenses;
    return {
      from, to, revenue, totalRevenue, expenses, totalExpenses,
      grossProfit, netProfit: grossProfit,
    };
  }

  /** Balance Sheet as of a date. Assets/Liabilities/Equity from POSTED entries. */
  async balanceSheet(asOf: string): Promise<BalanceSheetReport> {
    const rows = await this.prisma.$queryRaw<
      { coaCode: string; coaName: string; coaType: string; totalDebit: bigint; totalCredit: bigint }[]
    >`
      SELECT coa.code AS "coaCode", coa.name AS "coaName", coa."type"::text AS "coaType",
             COALESCE(SUM(jl.debit), 0)::bigint AS "totalDebit",
             COALESCE(SUM(jl.credit), 0)::bigint AS "totalCredit"
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl."journalEntryId"
      JOIN ledger_accounts la ON la.id = jl."ledgerAccountId"
      JOIN chart_of_accounts coa ON coa.id = la."accountId"
      WHERE je.status = 'POSTED'
        AND je."entryDate" <= ${new Date(asOf)}
        AND coa."type" IN ('ASSET','LIABILITY','EQUITY')
      GROUP BY coa.code, coa.name, coa."type"
      ORDER BY coa.code ASC
    `;

    const assets: BalanceSheetRow[] = [];
    const liabilities: BalanceSheetRow[] = [];
    const equity: BalanceSheetRow[] = [];
    let totalAssets = 0, totalLiabilities = 0, totalEquity = 0;

    for (const r of rows) {
      const debit = Number(r.totalDebit);
      const credit = Number(r.totalCredit);
      if (r.coaType === 'ASSET') {
        const bal = debit - credit;
        assets.push({ accountCode: r.coaCode, accountName: r.coaName, balance: bal });
        totalAssets += bal;
      } else if (r.coaType === 'LIABILITY') {
        const bal = credit - debit;
        liabilities.push({ accountCode: r.coaCode, accountName: r.coaName, balance: bal });
        totalLiabilities += bal;
      } else {
        const bal = credit - debit;
        equity.push({ accountCode: r.coaCode, accountName: r.coaName, balance: bal });
        totalEquity += bal;
      }
    }

    return { asOf, assets, totalAssets, liabilities, totalLiabilities, equity, totalEquity };
  }

  /** Cash Flow: movement on ASSET accounts of kind CASH/BANK/MFS. */
  async cashFlow(from: string, to: string): Promise<CashFlowReport> {
    const rows = await this.prisma.$queryRaw<
      { coaCode: string; coaName: string; totalDebit: bigint; totalCredit: bigint }[]
    >`
      SELECT coa.code AS "coaCode", coa.name AS "coaName",
             COALESCE(SUM(jl.debit), 0)::bigint AS "totalDebit",
             COALESCE(SUM(jl.credit), 0)::bigint AS "totalCredit"
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl."journalEntryId"
      JOIN ledger_accounts la ON la.id = jl."ledgerAccountId"
      JOIN chart_of_accounts coa ON coa.id = la."accountId"
      WHERE je.status = 'POSTED'
        AND je."entryDate" >= ${new Date(from)}
        AND je."entryDate" <= ${new Date(to)}
        AND coa."type" = 'ASSET'
        AND la.kind IN ('CASH','BANK','MFS')
      GROUP BY coa.code, coa.name
      ORDER BY coa.code ASC
    `;

    const out: CashFlowRow[] = rows.map((r) => {
      const inflow = Number(r.totalDebit);
      const outflow = Number(r.totalCredit);
      return { accountCode: r.coaCode, accountName: r.coaName, inflow, outflow, net: inflow - outflow };
    });

    const totalInflow = out.reduce((s, r) => s + r.inflow, 0);
    const totalOutflow = out.reduce((s, r) => s + r.outflow, 0);
    return { from, to, rows: out, totalInflow, totalOutflow, netChange: totalInflow - totalOutflow };
  }
}