'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, TrendingUp, TrendingDown, Wallet, Receipt } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, EmptyState } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery } from '@/lib/hooks';
import { formatPoisha, formatDate } from '@/lib/utils';

interface JournalLine {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  sourceType: string;
  totalDebit: number;
  totalCredit: number;
  status: 'DRAFT' | 'POSTED' | 'VOID';
}

export default function AccountingPage() {
  const { data, loading, error } = useQuery<JournalLine[]>('/api/v1/accounting/journal');

  // Defensive: guard against non-array responses (401/404 → null)
  const journalRows = Array.isArray(data) ? data : [];

  const columns: Column<JournalLine>[] = [
    { key: 'num', header: 'Entry #', render: (r) => <code className="font-mono text-slate-800">{r.entryNumber}</code> },
    { key: 'date', header: 'Date', render: (r) => <span className="text-[12.5px] text-slate-500">{formatDate(r.entryDate)}</span> },
    { key: 'desc', header: 'Description', render: (r) => <span className="text-slate-700">{r.description}</span> },
    { key: 'src', header: 'Source', render: (r) => <StatusChip label={r.sourceType} tone="info" /> },
    { key: 'debit', header: 'Debit', align: 'right', render: (r) => <span className="tabular-nums">{formatPoisha(r.totalDebit)}</span> },
    { key: 'credit', header: 'Credit', align: 'right', render: (r) => <span className="tabular-nums">{formatPoisha(r.totalCredit)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <StatusChip label={r.status} tone={r.status === 'POSTED' ? 'success' : r.status === 'DRAFT' ? 'warning' : 'neutral'} />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Accounting"
        subtitle="Double-entry ledger · auto-posted from sales, GRN, payroll, refunds"
        actions={
          <>
            <Link href="/accounting/income-expense" className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Receipt className="w-4 h-4" /> Income / Expense
            </Link>
            <Link href="/accounting/reports" className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">
              <TrendingUp className="w-4 h-4" /> Reports
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard label="Cash in Hand" value="—" Icon={Wallet} tone="sky" />
        <SummaryCard label="Receivables (AR)" value="—" Icon={TrendingUp} tone="teal" />
        <SummaryCard label="Payables (AP)" value="—" Icon={TrendingDown} tone="warning" />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">General Ledger</h3>
            <p className="text-[12.5px] text-slate-500">Recent journal entries — must balance (Σdebit = Σcredit)</p>
          </div>
          <Link href="/accounting/ledger" className="text-[12.5px] font-medium text-sky-700 hover:underline">
            Full ledger →
          </Link>
        </div>
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading ledger…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : journalRows.length === 0 ? (
          <EmptyState icon={BookOpen} title="No journal entries yet" description="Entries post automatically from sales, purchases, and payroll." />
        ) : (
          <DataTable columns={columns} rows={journalRows} rowKey={(r) => r.id} />
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  Icon,
  tone,
}: {
  label: string;
  value: string;
  Icon: typeof Wallet;
  tone: 'sky' | 'teal' | 'warning';
}) {
  const toneClass =
    tone === 'sky' ? 'bg-sky-50 text-sky-700' : tone === 'teal' ? 'bg-teal-50 text-teal-600' : 'bg-warning-50 text-warning-700';
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12.5px] font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">{value}</p>
        </div>
        <span className={`w-10 h-10 grid place-items-center rounded-lg ${toneClass}`}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
    </div>
  );
}