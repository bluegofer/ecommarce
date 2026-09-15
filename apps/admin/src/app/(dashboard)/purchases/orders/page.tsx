'use client';

import { ShoppingCart } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, EmptyState } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery } from '@/lib/hooks';
import { formatPoisha, formatDate } from '@/lib/utils';

interface PO {
  id: string;
  poNumber: string;
  supplier: { name: string };
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  totalPoisha: number;
  itemCount: number;
  expectedDeliveryAt: string | null;
  createdAt: string;
}

const STATUS_TONE: Record<PO['status'], 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'neutral',
  SENT: 'info',
  PARTIALLY_RECEIVED: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'danger',
};

export default function PurchaseOrdersPage() {
  const { data, loading, error } = useQuery<PO[]>('/api/v1/purchase/orders');

  const columns: Column<PO>[] = [
    { key: 'num', header: 'PO #', render: (r) => <code className="font-mono text-slate-800">{r.poNumber}</code> },
    { key: 'supplier', header: 'Supplier', render: (r) => <span className="font-medium text-slate-800">{r.supplier.name}</span> },
    { key: 'items', header: 'Items', align: 'center', render: (r) => <span className="tabular-nums">{r.itemCount}</span> },
    { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="tabular-nums font-medium text-slate-800">{formatPoisha(r.totalPoisha)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusChip label={r.status.replace(/_/g, ' ')} tone={STATUS_TONE[r.status]} /> },
    { key: 'eta', header: 'Expected', render: (r) => r.expectedDeliveryAt ? <span className="text-[12.5px] text-slate-500">{formatDate(r.expectedDeliveryAt)}</span> : <span className="text-slate-400">—</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Purchase Orders" subtitle="Track POs from SENT to RECEIVED · partial receipts supported" />
      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading POs…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No purchase orders yet" description="Convert an approved PR into a PO." />
        ) : (
          <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
        )}
      </div>
    </div>
  );
}