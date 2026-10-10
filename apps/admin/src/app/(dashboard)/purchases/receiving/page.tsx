'use client';

import { Package, CheckCircle2 } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, EmptyState, useToast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';
import { formatDate } from '@/lib/utils';

interface GRN {
  id: string;
  grnNumber: string;
  purchaseOrder: { poNumber: string; supplier: { name: string } };
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  itemCount: number;
  createdAt: string;
  confirmedAt: string | null;
}

const STATUS_TONE: Record<GRN['status'], 'neutral' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  CONFIRMED: 'success',
  CANCELLED: 'danger',
};

export default function ReceivingPage() {
  const toast = useToast();
  const { data, loading, error, refetch } = useQuery<GRN[]>('/api/v1/purchase/grns');

  const confirmMutation = useMutation<string, unknown>(
    'post',
    (input) => `/api/v1/purchase/grns/${input as unknown as string}/confirm`,
  );

  const columns: Column<GRN>[] = [
    { key: 'num', header: 'GRN #', render: (r) => <code className="font-mono text-slate-800">{r.grnNumber}</code> },
    { key: 'po', header: 'PO #', render: (r) => <code className="font-mono text-[12.5px] text-slate-600">{r.purchaseOrder.poNumber}</code> },
    { key: 'supplier', header: 'Supplier', render: (r) => <span className="text-slate-700">{r.purchaseOrder.supplier.name}</span> },
    { key: 'items', header: 'Items', align: 'center', render: (r) => <span className="tabular-nums">{r.itemCount}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusChip label={r.status} tone={STATUS_TONE[r.status]} /> },
    {
      key: 'confirmed',
      header: 'Confirmed',
      render: (r) => r.confirmedAt ? <span className="text-[12.5px] text-slate-500">{formatDate(r.confirmedAt)}</span> : <span className="text-slate-400">—</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => r.status === 'DRAFT' ? (
        <button
          type="button"
          onClick={async () => {
            try {
              await confirmMutation.mutate(r.id);
              toast.success('GRN confirmed', 'Stock + supplier AP + ledger posted');
              void refetch();
            } catch (e) {
              toast.error('Confirm failed', e instanceof Error ? e.message : 'Unknown');
            }
          }}
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-success-700 hover:text-success-600"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
        </button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Receiving (GRN)"
        subtitle="Confirm a GRN → stock increments + supplier payable + balanced journal entry — one transaction"
      />
      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading GRNs…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={Package} title="No GRNs yet" description="Create a GRN against a purchase order." />
        ) : (
          <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
        )}
      </div>
    </div>
  );
}