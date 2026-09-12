'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, Search, Download } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, EmptyState, useToast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery } from '@/lib/hooks';
import { formatPoisha, formatDate } from '@/lib/utils';

interface CustomerRow {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  totalOrders: number;
  totalSpentPoisha: number;
  clvPoisha: number;
  lastOrderAt: string | null;
  isGuest: boolean;
  segmentLabels: string[];
}

interface CustomerListResponse {
  items: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
}

export default function CustomersPage() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const query = new URLSearchParams();
  if (q) query.set('q', q);
  query.set('page', String(page));
  query.set('pageSize', '20');

  const { data, loading, error, refetch } = useQuery<CustomerListResponse>(
    `/api/v1/crm/customers?${query.toString()}`,
  );

  const columns: Column<CustomerRow>[] = [
    {
      key: 'name',
      header: 'Customer',
      render: (row) => (
        <div>
          <Link
            href={`/customers/${row.id}`}
            className="font-medium text-slate-800 hover:text-sky-700"
          >
            {row.fullName}
          </Link>
          <div className="text-[12px] text-slate-400 font-mono">{row.phone}</div>
        </div>
      ),
    },
    {
      key: 'orders',
      header: 'Orders',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums text-slate-700">{row.totalOrders}</span>
      ),
    },
    {
      key: 'spent',
      header: 'Spent',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums text-slate-700">
          {formatPoisha(row.totalSpentPoisha)}
        </span>
      ),
    },
    {
      key: 'clv',
      header: 'CLV',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums font-semibold text-sky-700">
          {formatPoisha(row.clvPoisha)}
        </span>
      ),
    },
    {
      key: 'segment',
      header: 'Segments',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.segmentLabels.length === 0 ? (
            <span className="text-slate-400 text-[12.5px]">—</span>
          ) : (
            row.segmentLabels.slice(0, 2).map((s) => (
              <StatusChip key={s} label={s} tone="info" />
            ))
          )}
        </div>
      ),
    },
    {
      key: 'lastOrder',
      header: 'Last order',
      render: (row) =>
        row.lastOrderAt ? (
          <span className="text-[12.5px] text-slate-500">{formatDate(row.lastOrderAt)}</span>
        ) : (
          <span className="text-slate-400">Never</span>
        ),
    },
    {
      key: 'status',
      header: '',
      render: (row) =>
        row.isGuest ? <StatusChip label="Guest" tone="neutral" /> : null,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        subtitle="360° view with CLV · segments · follow-ups · complaints · call/chat history"
        actions={
          <button
            type="button"
            onClick={() => toast.push({ tone: 'info', title: 'CSV export', description: 'Wired in follow-up sub-batch.' })}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        }
      />

      <div className="card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, phone, email, or order #…"
            className="w-full h-9 pl-9 pr-3 rounded border border-border bg-white text-sm focus:border-sky-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading customers…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Customers appear here once orders are placed (guest or registered)."
          />
        ) : (
          <>
            <DataTable columns={columns} rows={data.items} rowKey={(r) => r.id} />
            <div className="px-4 py-3 border-t border-border flex items-center justify-between text-[12.5px] text-slate-500">
              <span>
                Showing {(data.page - 1) * data.pageSize + 1}–
                {Math.min(data.page * data.pageSize, data.total)} of {data.total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 px-2.5 rounded border border-border bg-white disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="tabular-nums">
                  Page {page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * data.pageSize >= data.total}
                  className="h-8 px-2.5 rounded border border-border bg-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}