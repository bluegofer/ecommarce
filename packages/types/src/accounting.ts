// packages/types/src/accounting.ts
// Chart of accounts, ledger, journal entries, AR/AP, income/expense.
// All money = integer poisha (BDT). Journal must balance: Σdebit = Σcredit.

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type NormalBalance = 'DEBIT' | 'CREDIT';
export type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'VOID';
export type JournalSourceType =
  | 'ORDER'
  | 'GRN'
  | 'SUPPLIER_PAYMENT'
  | 'CUSTOMER_PAYMENT'
  | 'INCOME'
  | 'EXPENSE'
  | 'PAYROLL'
  | 'POS_SALE'
  | 'MANUAL'
  | 'REVERSAL';
export type PaymentAccountKind = 'CASH' | 'BANK' | 'MFS';
export type IncomeExpenseType = 'INCOME' | 'EXPENSE';
export type DueStatus = 'OPEN' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'WRITTEN_OFF';

export interface ChartOfAccountsDto {
  id: string;
  code: string;
  name: string;
  nameBn: string | null;
  type: AccountType;
  normalBalance: NormalBalance;
  parentId: string | null;
  isLeaf: boolean;
  description: string | null;
  children?: ChartOfAccountsDto[];
  createdAt: string;
  updatedAt: string;
}

export interface LedgerAccountDto {
  id: string;
  code: string;
  name: string;
  nameBn: string | null;
  accountId: string;
  kind: PaymentAccountKind | null;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLedgerAccountInput {
  code: string;
  name: string;
  nameBn?: string;
  accountId: string;
  kind?: PaymentAccountKind;
  openingBalance?: number;
  notes?: string;
}

export interface JournalLineInput {
  ledgerAccountId: string;
  debit: number;   // >=0, mutually exclusive with credit
  credit: number;  // >=0, mutually exclusive with debit
  description?: string;
}

export interface CreateJournalEntryInput {
  entryDate: string;        // ISO
  description: string;
  sourceType?: JournalSourceType;
  sourceId?: string;
  branchId?: string;
  reversalOfId?: string;
  lines: JournalLineInput[];
}

export interface JournalLineDto {
  id: string;
  journalEntryId: string;
  ledgerAccountId: string;
  debit: number;
  credit: number;
  description: string | null;
  createdAt: string;
}

export interface JournalEntryDto {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  status: JournalEntryStatus;
  sourceType: JournalSourceType;
  sourceId: string | null;
  branchId: string | null;
  reversalOfId: string | null;
  postedAt: string | null;
  postedById: string | null;
  totalDebit: number;
  totalCredit: number;
  lines: JournalLineDto[];
  createdAt: string;
  updatedAt: string;
}

export interface IncomeExpenseCategoryDto {
  id: string;
  name: string;
  nameBn: string | null;
  type: IncomeExpenseType;
  coaCode: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeExpenseRecordDto {
  id: string;
  recordNumber: string;
  type: IncomeExpenseType;
  categoryId: string;
  amount: number;
  ledgerAccountId: string;
  journalEntryId: string | null;
  branchId: string | null;
  occurredAt: string;
  reference: string | null;
  description: string | null;
  attachmentUrl: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDueDto {
  id: string;
  customerId: string;
  orderId: string | null;
  amount: number;
  paidAmount: number;
  balance: number;
  dueDate: string | null;
  status: DueStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Financial reports ---

export interface ProfitAndLossRow {
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface ProfitAndLossReport {
  from: string;
  to: string;
  revenue: ProfitAndLossRow[];
  totalRevenue: number;
  expenses: ProfitAndLossRow[];
  totalExpenses: number;
  grossProfit: number;   // totalRevenue - totalExpenses (simplified P&L)
  netProfit: number;     // alias for grossProfit (no COGS split in Step 9)
}

export interface BalanceSheetRow {
  accountCode: string;
  accountName: string;
  balance: number;
}

export interface BalanceSheetReport {
  asOf: string;
  assets: BalanceSheetRow[];
  totalAssets: number;
  liabilities: BalanceSheetRow[];
  totalLiabilities: number;
  equity: BalanceSheetRow[];
  totalEquity: number;
}

export interface CashFlowRow {
  accountCode: string;
  accountName: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface CashFlowReport {
  from: string;
  to: string;
  rows: CashFlowRow[];
  totalInflow: number;
  totalOutflow: number;
  netChange: number;
}