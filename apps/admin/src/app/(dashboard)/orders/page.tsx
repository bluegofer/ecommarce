'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, CheckCircle2, Filter, ReceiptText } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, ORDER_STATUS_TONE, EmptyState, useToast } from '@/components/ui';
import type { Column, StatusTone } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';
import { formatPoisha, formatDateTime } from '@/lib/utils';

interface OrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  status: string;
  totalPoisha: number;
  paymentMethod: string;
  courier: string | null;
  createdAt: string;
  verifiedAt: string | null;
}

interface OrderListResponse {
  items: OrderRow[];
  total: number;
  page: number;
  pageSize: number;
}

const QUICK_TABS = [
  { key: '', label: 'All' },
  { key: 'PENDING_VERIFICATION', label: 'Pending verification' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
] as const;

export default function OrdersPage() {
  const toast = useToast();
  const [status, setStatus] = useState<string>('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (q) query.set('q', q);
  query.set('page', String(page));
  query.set('pageSize', '20');

  const { data, loading, error, refetch } = useQuery<OrderListResponse>(
    `/api/v1/orders?${query.toString()}`,
  );

  const verifyMutation = useMutation<{ ids: string[] }, unknown>(
    'post',
    '/api/v1/orders/verify-bulk',
  );

  const columns: Column<OrderRow>[] = [
    {
      key: 'select',
      header: '',
      render: (row) => (
        <input
          type="checkbox"
          checked={selected.has(row.id)}
          onChange={(e) => {
            const next = new Set(selected);
            if (e.target.checked) next.add(row.id);
            else next.delete(row.id);
            setSelected(next);
          }}
          className="w-4 h-4 rounded border-border text-sky-600"
          aria-label={`Select ${row.orderNumber}`}
        />
      ),
    },
    {
      key: 'order',
      header: 'Order',
      render: (row) => (
        <Link
          href={`/orders/${row.id}`}
          className="font-mono font-medium text-slate-800 hover:text-sky-700"
        >
          {row.orderNumber}
        </Link>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => (
        <div>
          <div className="text-slate-800">{row.customerName}</div>
          <div className="text-[12px] text-slate-400 font-mono">{row.phone}</div>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (row) => (
        <span className="font-medium tabular-nums text-slate-800">
          {formatPoisha(row.totalPoisha)}
        </span>
      ),
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (row) => (
        <StatusChip
          label={row.paymentMethod}
          tone={row.paymentMethod === 'COD' ? 'warning' : 'success'}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <StatusChip
          label={row.status.replace(/_/g, ' ')}
          tone={(ORDER_STATUS_TONE[row.status] ?? 'neutral') as StatusTone}
        />
      ),
    },
    {
      key: 'created',
      header: 'Placed',
      render: (row) => (
        <span className="text-[12.5px] text-slate-500">{formatDateTime(row.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders"
        subtitle="Full order pipeline: PENDING → VERIFIED → PROCESSING → SHIPPED → DELIVERED"
        actions={
          <>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await verifyMutation.mutate({ ids: Array.from(selected) });
                    toast.success(`Verified ${selected.size} orders`);
                    setSelected(new Set());
                    void refetch();
                  } catch (e) {
                    toast.error('Verify failed', e instanceof Error ? e.message : 'Unknown');
                  }
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-success-600 text-white text-sm font-medium hover:bg-success-700"
              >
                <CheckCircle2 className="w-4 h-4" /> Verify {selected.size}
              </button>
            )}
          </>
        }
      />

      {/* Tabs */}
      <div className="border-b border-border overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {QUICK_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setStatus(t.key);
                setPage(1);
              }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
                status === t.key
                  ? 'border-sky-600 text-sky-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search order #, phone, or customer name…"
            className="w-full h-9 pl-9 pr-3 rounded border border-border bg-white text-sm focus:border-sky-400 focus:outline-none"
          />
        </div>
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-500">
          <Filter className="w-4 h-4 text-slate-400" />
          {data?.total ?? 0} orders
        </span>
        <button
          type="button"
          onClick={() => void refetch()}
          className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700"
        >
          Refresh
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading orders…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No orders match"
            description="Try changing the tab or clearing the search."
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