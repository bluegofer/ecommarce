'use client';

import { useState } from 'react';
import { Truck, Wallet, Bike, CheckCircle2 } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, useToast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';
import { formatPoisha, formatDateTime } from '@/lib/utils';

interface DispatchOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  zone: string;
  status: string;
  courier: string | null;
  trackingNumber: string | null;
  riderName: string | null;
  codPoisha: number;
  createdAt: string;
}

interface Settlement {
  id: string;
  courier: string;
  period: string;
  codCollectedPoisha: number;
  payoutPoisha: number;
  status: 'PENDING' | 'MATCHED' | 'DISCREPANCY';
}

export default function DeliveryPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'dispatch' | 'settlements'>('dispatch');

  const dispatchQuery = useQuery<DispatchOrder[]>('/api/v1/orders?status=PROCESSING');
  const settlementQuery = useQuery<Settlement[]>('/api/v1/courier/settlements');

  const assignMutation = useMutation<{ id: string; courier: string }, unknown>(
    'post',
    (input) => `/api/v1/orders/${(input as { id: string }).id}/dispatch`,
  );

  const dispatchColumns: Column<DispatchOrder>[] = [
    { key: 'order', header: 'Order', render: (r) => <code className="font-mono text-slate-800">{r.orderNumber}</code> },
    { key: 'customer', header: 'Customer', render: (r) => r.customerName },
    { key: 'zone', header: 'Zone', render: (r) => <StatusChip label={r.zone} tone="info" /> },
    {
      key: 'cod',
      header: 'COD',
      align: 'right',
      render: (r) => <span className="tabular-nums text-slate-800">{formatPoisha(r.codPoisha)}</span>,
    },
    {
      key: 'courier',
      header: 'Courier',
      render: (r) => r.courier ? <span>{r.courier}</span> : <span className="text-slate-400">—</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <button
          type="button"
          onClick={async () => {
            await assignMutation.mutate({ id: r.id, courier: 'PATHAO' });
            toast.success('Dispatched via Pathao');
            void dispatchQuery.refetch();
          }}
          className="text-[12.5px] font-medium text-sky-700 hover:text-sky-800"
        >
          Dispatch
        </button>
      ),
    },
  ];

  const settlementColumns: Column<Settlement>[] = [
    { key: 'courier', header: 'Courier', render: (r) => <span className="font-medium">{r.courier}</span> },
    { key: 'period', header: 'Period', render: (r) => r.period },
    {
      key: 'cod',
      header: 'COD collected',
      align: 'right',
      render: (r) => <span className="tabular-nums text-slate-700">{formatPoisha(r.codCollectedPoisha)}</span>,
    },
    {
      key: 'payout',
      header: 'Payout',
      align: 'right',
      render: (r) => <span className="tabular-nums font-medium text-slate-800">{formatPoisha(r.payoutPoisha)}</span>,
    },
    {
      key: 'status',
      header: 'Recon',
      render: (r) => (
        <StatusChip
          label={r.status}
          tone={r.status === 'MATCHED' ? 'success' : r.status === 'DISCREPANCY' ? 'danger' : 'warning'}
        />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Delivery"
        subtitle="Dispatch queue · Pathao (D-06) · COD reconciliation · settlement tracking"
      />

      <div className="border-b border-border">
        <nav className="flex gap-1">
          {[
            { key: 'dispatch', label: 'Dispatch queue', icon: Truck },
            { key: 'settlements', label: 'Settlements', icon: Wallet },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key as typeof tab)}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
                  tab === t.key ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {tab === 'dispatch' ? (
        <div className="card overflow-hidden">
          {dispatchQuery.loading && !dispatchQuery.data ? (
            <div className="p-10 text-center text-slate-400">Loading queue…</div>
          ) : dispatchQuery.error ? (
            <div className="p-10 text-center text-danger-700">{dispatchQuery.error.message}</div>
          ) : !dispatchQuery.data || dispatchQuery.data.length === 0 ? (
            <div className="p-10 text-center text-success-700">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-success-500" />
              All caught up — no orders waiting for dispatch.
            </div>
          ) : (
            <DataTable columns={dispatchColumns} rows={dispatchQuery.data} rowKey={(r) => r.id} />
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {settlementQuery.loading && !settlementQuery.data ? (
            <div className="p-10 text-center text-slate-400">Loading settlements…</div>
          ) : settlementQuery.error ? (
            <div className="p-10 text-center text-danger-700">{settlementQuery.error.message}</div>
          ) : !settlementQuery.data || settlementQuery.data.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Bike className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              No settlement data yet — courier adapters wired in Step 13.
            </div>
          ) : (
            <DataTable columns={settlementColumns} rows={settlementQuery.data} rowKey={(r) => r.id} />
          )}
        </div>
      )}
    </div>
  );
}