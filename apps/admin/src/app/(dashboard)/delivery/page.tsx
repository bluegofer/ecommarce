'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Truck, Wallet, Bike, CheckCircle2 } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, useToast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';
import { formatPoisha, formatDateTime } from '@/lib/utils';

interface DispatchOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalPoisha: number;
  placedAt: string;
  itemCount: number;
  contactPhone: string;
  shippingCity: string;
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

interface ActiveShipment {
  shipmentId: string;
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  city: string | null;
  courier: string;
  trackingNumber: string | null;
  shipmentStatus: string;
  orderStatus: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  updatedAt: string;
  createdAt: string;
  riderName: string | null;
  riderPhone: string | null;
}

export default function DeliveryPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'dispatch' | 'active' | 'settlements'>('dispatch');

  const dispatchQuery = useQuery<DispatchOrder[]>('/api/v1/orders?status=PROCESSING', { refreshInterval: 30_000 });
  const settlementQuery = useQuery<Settlement[]>('/api/v1/courier/settlements/unreconciled', { refreshInterval: 30_000 });
  const activeQuery = useQuery<ActiveShipment[]>('/api/v1/courier/active-shipments', { refreshInterval: 30_000 });

  // Defensive: guard against non-array responses (401/404 → null)
  const dispatchRows = Array.isArray(dispatchQuery.data)
    ? dispatchQuery.data
    : ((dispatchQuery.data as unknown as { items?: DispatchOrder[] } | null)?.items ?? []);
  const settlementRows = Array.isArray(settlementQuery.data)
    ? settlementQuery.data
    : ((settlementQuery.data as unknown as { items?: Settlement[] } | null)?.items ?? []);
  const activeRows = Array.isArray(activeQuery.data) ? activeQuery.data : [];

  const assignMutation = useMutation<{ id: string; courier: string }, unknown>(
    'post',
    (input) => `/api/v1/orders/${(input as { id: string }).id}/dispatch`,
  );

  const dispatchColumns: Column<DispatchOrder>[] = [
    { key: 'order', header: 'Order', render: (r) => <code className="font-mono text-slate-800">{r.orderNumber}</code> },
    { key: 'customer', header: 'Customer', render: (r) => <span>{r.contactPhone}</span> },
    { key: 'city', header: 'City', render: (r) => r.shippingCity ? <StatusChip label={r.shippingCity} tone="info" /> : <span className="text-slate-400">—</span> },
    {
      key: 'cod',
      header: 'COD',
      align: 'right',
      render: (r) => <span className="tabular-nums text-slate-800">{formatPoisha(r.totalPoisha)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <button
          type="button"
          onClick={async () => {
            await assignMutation.mutate({ id: r.id, courier: 'STEADFAST' });
            toast.success('Dispatched via Steadfast');
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

  const activeColumns: Column<ActiveShipment>[] = [
    {
      key: 'order',
      header: 'Order',
      render: (r) => (
        <Link href={`/orders/${r.orderId}`} className="font-mono text-sky-700 hover:underline">
          {r.orderNumber}
        </Link>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (r) => (
        <div>
          <div className="text-slate-800">{r.customerName ?? '\u2014'}</div>
          <div className="text-[11.5px] text-slate-500">{r.customerPhone ?? ''}</div>
        </div>
      ),
    },
    { key: 'city', header: 'City', render: (r) => r.city ?? '\u2014' },
    { key: 'courier', header: 'Courier', render: (r) => <span className="font-medium text-slate-800">{r.courier}</span> },
    {
      key: 'tracking',
      header: 'Tracking',
      render: (r) => (
        <code className="text-[12px] text-slate-600">
          {r.trackingNumber ? r.trackingNumber.slice(0, 22) + (r.trackingNumber.length > 22 ? '\u2026' : '') : '\u2014'}
        </code>
      ),
    },
    {
      key: 'rider',
      header: 'Rider',
      render: (r) => (
        r.riderName ? (
          <div>
            <div className="text-slate-800">{r.riderName}</div>
            {r.riderPhone ? <div className="text-[11.5px] text-slate-500">{r.riderPhone}</div> : null}
          </div>
        ) : ('—')
      ),
    },
    {
      key: 'order_status',
      header: 'Order status',
      render: (r) => (
        <StatusChip
          label={r.orderStatus}
          tone={
            r.orderStatus === 'DELIVERED'
              ? 'success'
              : r.orderStatus === 'CANCELLED' || r.orderStatus === 'RETURNED'
                ? 'danger'
                : r.orderStatus === 'SHIPPED' || r.orderStatus === 'IN_TRANSIT' || r.orderStatus === 'OUT_FOR_DELIVERY'
                  ? 'info'
                  : 'warning'
          }
        />
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      render: (r) => <span className="text-[12px] text-slate-500">{formatDateTime(r.updatedAt)}</span>,
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
            { key: 'active', label: 'Active shipments', icon: Truck },
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
      ) : tab === 'active' ? (
        <div className="card overflow-hidden">
          {activeQuery.loading && !activeQuery.data ? (
            <div className="p-10 text-center text-slate-400">Loading active shipments…</div>
          ) : activeQuery.error ? (
            <div className="p-10 text-center text-danger-700">{activeQuery.error.message}</div>
          ) : activeRows.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Truck className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              No active shipments — all caught up.
            </div>
          ) : (
            <DataTable columns={activeColumns} rows={activeRows} rowKey={(r) => r.shipmentId} />
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
