// packages/api/src/modules/accounting/controllers/accounting.controller.ts
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ChartOfAccountsService } from '../services/chart-of-accounts.service';
import { LedgerService } from '../services/ledger.service';
import { ReportsService } from '../services/reports.service';
import type { CreateJournalEntryInput } from '@ecommarce/types';

@Controller('accounting')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountingController {
  constructor(
    private readonly coa: ChartOfAccountsService,
    private readonly ledger: LedgerService,
    private readonly reports: ReportsService,
  ) {}

  // ---- Chart of Accounts ----
  @Get('coa')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  listCoa() { return this.coa.list(); }

  @Get('coa/tree')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  coaTree() { return this.coa.tree(); }

  @Get('coa/:id')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  getCoa(@Param('id') id: string) { return this.coa.findById(id); }

  @Post('coa')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER')
  createCoa(@Body() body: any) { return this.coa.create(body); }

  // ---- Ledger Accounts ----
  @Get('ledger-accounts')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  listLedgerAccounts() { return this.coa.listLedgerAccounts(); }

  // Alias kept for the admin console — /accounting/ledger → same list.
  @Get('ledger')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  listLedgerAlias() { return this.coa.listLedgerAccounts(); }

  @Get('ledger-accounts/:id')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  getLedgerAccount(@Param('id') id: string) { return this.coa.findLedgerAccountById(id); }

  @Post('ledger-accounts')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER')
  createLedgerAccount(@Body() body: any) { return this.coa.createLedgerAccount(body); }

  // ---- Journal ----
  @Get('journal')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  listJournal(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sourceType') sourceType?: any,
    @Query('status') status?: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.ledger.list({
      from, to, sourceType, status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('journal/:id')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  getJournal(@Param('id') id: string) { return this.ledger.findById(id); }

  @Post('journal')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER')
  createJournal(@Body() body: CreateJournalEntryInput) {
    return this.ledger.postEntry(body, { status: 'DRAFT' });
  }

  @Post('journal/:id/post')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER')
  postJournal(@Param('id') id: string) { return this.ledger.postDraft(id); }

  @Post('journal/:id/reverse')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER')
  reverseJournal(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.ledger.reverse(id, body.reason ?? 'No reason given');
  }

  // ---- Income / Expense ----
  // The admin console's "Income / Expense" link opens /accounting/income-expense.
  // For now, return the journal entries filtered by income/expense source types
  // so the page renders real data instead of a 404. A dedicated income_expense
  // table can replace this in a later batch without changing the endpoint.
  @Get('income-expense')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  listIncomeExpense(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.ledger.list({
      from,
      to,
      sourceType: 'INCOME_EXPENSE' as never,
      limit: 200,
    });
  }

  // ---- Reports ----
  @Get('reports/profit-and-loss')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  pnl(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.profitAndLoss(from, to);
  }

  @Get('reports/balance-sheet')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  bs(@Query('asOf') asOf: string) { return this.reports.balanceSheet(asOf); }

  @Get('reports/cash-flow')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  cf(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.cashFlow(from, to);
  }
}