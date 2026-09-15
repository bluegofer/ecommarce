'use client';

import { useState } from 'react';
import { CreditCard, RotateCcw, Wallet } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, useToast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';
import { formatPoisha, formatDateTime } from '@/lib/utils';

interface Txn {
  id: string;
  orderNumber: string | null;
  gateway: 'BKASH' | 'NAGAD' | 'SSLCOMMERZ' | 'COD';
  amountPoisha: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIAL_REFUND';
  reference: string | null;
  createdAt: string;
}

interface Refund {
  id: string;
  orderNumber: string | null;
  amountPoisha: number;
  status: 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

const TABS = ['Transactions', 'Refunds'] as const;

export default function PaymentsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Transactions');

  const txnQuery = useQuery<Txn[]>('/api/v1/payments/transactions');
  const refundQuery = useQuery<Refund[]>('/api/v1/payments/refunds');

  const txnColumns: Column<Txn>[] = [
    { key: 'order', header: 'Order', render: (r) => r.orderNumber ? <code className="font-mono text-slate-800">{r.orderNumber}</code> : <span className="text-slate-400">—</span> },
    {
      key: 'gateway',
      header: 'Gateway',
      render: (r) => <StatusChip label={r.gateway} tone={r.gateway === 'COD' ? 'warning' : 'info'} />,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (r) => <span className="tabular-nums font-medium text-slate-800">{formatPoisha(r.amountPoisha)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <StatusChip
          label={r.status}
          tone={
            r.status === 'PAID'
              ? 'success'
              : r.status === 'FAILED'
                ? 'danger'
                : r.status === 'PENDING'
                  ? 'warning'
                  : 'violet'
          }
        />
      ),
    },
    {
      key: 'ref',
      header: 'Reference',
      render: (r) => <span className="font-mono text-[12px] text-slate-500">{r.reference ?? '—'}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      render: (r) => <span className="text-[12.5px] text-slate-500">{formatDateTime(r.createdAt)}</span>,
    },
  ];

  const refundColumns: Column<Refund>[] = [
    { key: 'order', header: 'Order', render: (r) => r.orderNumber ? <code className="font-mono text-slate-800">{r.orderNumber}</code> : <span className="text-slate-400">—</span> },
    {
      key: 'amount',
      header: 'Refund amount',
      align: 'right',
      render: (r) => <span className="tabular-nums font-medium text-danger-700">{formatPoisha(r.amountPoisha)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <StatusChip
          label={r.status}
          tone={
            r.status === 'COMPLETED'
              ? 'success'
              : r.status === 'FAILED'
                ? 'danger'
                : 'warning'
          }
        />
      ),
    },
    {
      key: 'created',
      header: 'Requested',
      render: (r) => <span className="text-[12.5px] text-slate-500">{formatDateTime(r.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payments & Refunds"
        subtitle="Multi-gateway ledger · live refund status · settlement reconciliation"
      />

      <div className="border-b border-border">
        <nav className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
                tab === t ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t === 'Transactions' ? <CreditCard className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
              {t}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'Transactions' ? (
        <div className="card overflow-hidden">
          {txnQuery.loading && !txnQuery.data ? (
            <div className="p-10 text-center text-slate-400">Loading…</div>
          ) : txnQuery.error ? (
            <div className="p-10 text-center text-danger-700">{txnQuery.error.message}</div>
          ) : !txnQuery.data || txnQuery.data.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Wallet className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              No transactions yet.
            </div>
          ) : (
            <DataTable columns={txnColumns} rows={txnQuery.data} rowKey={(r) => r.id} />
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {refundQuery.loading && !refundQuery.data ? (
            <div className="p-10 text-center text-slate-400">Loading…</div>
          ) : refundQuery.error ? (
            <div className="p-10 text-center text-danger-700">{refundQuery.error.message}</div>
          ) : !refundQuery.data || refundQuery.data.length === 0 ? (
            <div className="p-10 text-center text-slate-400">No refunds recorded.</div>
          ) : (
            <DataTable columns={refundColumns} rows={refundQuery.data} rowKey={(r) => r.id} />
          )}
        </div>
      )}
    </div>
  );
}