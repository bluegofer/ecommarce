'use client';

import Link from 'next/link';
import { ArrowLeft, Receipt } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, EmptyState } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery } from '@/lib/hooks';
import { formatPoisha, formatDate } from '@/lib/utils';

interface IncomeExpenseRow {
  id: string;
  kind: 'INCOME' | 'EXPENSE';
  categoryName: string;
  amountPoisha: number;
  note: string | null;
  recordedAt: string;
}

export default function IncomeExpensePage() {
  const { data, loading, error } = useQuery<IncomeExpenseRow[]>('/api/v1/accounting/income-expense');
  const rows = Array.isArray(data) ? data : [];

  const columns: Column<IncomeExpenseRow>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (r) => <span className="text-[12.5px] text-slate-500">{formatDate(r.recordedAt)}</span>,
    },
    {
      key: 'kind',
      header: 'Type',
      render: (r) => (
        <StatusChip label={r.kind} tone={r.kind === 'INCOME' ? 'success' : 'warning'} />
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (r) => <span className="text-slate-700">{r.categoryName}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (r) => (
        <span className={`tabular-nums ${r.kind === 'INCOME' ? 'text-success-700' : 'text-danger-700'}`}>
          {r.kind === 'INCOME' ? '+' : '−'}{formatPoisha(r.amountPoisha)}
        </span>
      ),
    },
    {
      key: 'note',
      header: 'Note',
      render: (r) => <span className="text-[12.5px] text-slate-500">{r.note ?? '—'}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <Link
        href="/accounting"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" /> Back to accounting
      </Link>

      <PageHeader
        title="Income & Expense"
        subtitle="Operational income and expense entries with categories"
      />

      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No income or expense entries yet"
            description="Entries recorded via the API will appear here."
          />
        ) : (
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
        )}
      </div>
    </div>
  );
}