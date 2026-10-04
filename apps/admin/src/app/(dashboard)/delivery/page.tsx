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
  courierCode: string;
  periodStart: string;
  periodEnd: string;
  expectedPoisha: number;
  receivedPoisha: number;
  orderCount: number;
  status: string;
  reconciledAt: string | null;
  notes: string | null;
}

export default function DeliveryPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'dispatch' | 'settlements'>('dispatch');

  const dispatchQuery = useQuery<DispatchOrder[]>('/api/v1/orders?status=PROCESSING', { refreshInterval: 30_000 });
  const settlementQuery = useQuery<Settlement[]>('/api/v1/courier/settlements/unreconciled', { refreshInterval: 30_000 });

  // Defensive: guard against non-array responses (401/404 → null)
  const dispatchRows = Array.isArray(dispatchQuery.data)
    ? dispatchQuery.data
    : ((dispatchQuery.data as unknown as { items?: DispatchOrder[] } | null)?.items ?? []);
  const settlementRows = Array.isArray(settlementQuery.data)
    ? settlementQuery.data
    : ((settlementQuery.data as unknown as { items?: Settlement[] } | null)?.items ?? []);

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
            toast.success('Dispatched via courier');
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
    { key: 'courier', header: 'Courier', render: (r) => <span className="font-medium">{r.courierCode}</span> },
    {
      key: 'period',
      header: 'Period',
      render: (r) => `${r.periodStart.slice(0, 10)} → ${r.periodEnd.slice(0, 10)}`,
    },
    {
      key: 'orders',
      header: 'Orders',
      align: 'right',
      render: (r) => <span className="tabular-nums text-slate-700">{r.orderCount}</span>,
    },
    {
      key: 'expected',
      header: 'Expected',
      align: 'right',
      render: (r) => <span className="tabular-nums text-slate-700">{formatPoisha(r.expectedPoisha)}</span>,
    },
    {
      key: 'received',
      header: 'Received',
      align: 'right',
      render: (r) => <span className="tabular-nums font-medium text-slate-800">{formatPoisha(r.receivedPoisha)}</span>,
    },
    {
      key: 'status',
      header: 'Recon',
      render: (r) => (
        <StatusChip
          label={r.status}
          tone={r.status === 'RECONCILED' ? 'success' : r.status === 'DISCREPANCY' ? 'danger' : 'warning'}
        />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Delivery"
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
          ) : dispatchRows.length === 0 ? (
            <div className="p-10 text-center text-success-700">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-success-500" />
              All caught up — no orders waiting for dispatch.
            </div>
          ) : (
            <DataTable columns={dispatchColumns} rows={dispatchRows} rowKey={(r) => r.id} />
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {settlementQuery.loading && !settlementQuery.data ? (
            <div className="p-10 text-center text-slate-400">Loading settlements…</div>
          ) : settlementQuery.error ? (
            <div className="p-10 text-center text-danger-700">{settlementQuery.error.message}</div>
          ) : settlementRows.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Bike className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              No settlement data yet — courier adapters wired in Step 13.
            </div>
          ) : (
            <DataTable columns={settlementColumns} rows={settlementRows} rowKey={(r) => r.id} />
          )}
        </div>
      )}
    </div>
  );
}
