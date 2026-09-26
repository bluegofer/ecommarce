'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRightLeft, Plus } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, Modal, useToast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';

interface Transfer {
  id: string;
  transferNumber: string;
  fromBranch: { code: string; name: string };
  toBranch: { code: string; name: string };
  status: 'DRAFT' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED';
  itemCount: number;
  createdAt: string;
}

const STATUS_TONE: Record<Transfer['status'], 'neutral' | 'info' | 'success' | 'warning'> = {
  DRAFT: 'neutral',
  DISPATCHED: 'info',
  RECEIVED: 'success',
  CANCELLED: 'warning',
};

export default function TransfersPage() {
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, loading, error, refetch } = useQuery<Transfer[]>(
    '/api/v1/pos/transfers',
  );

  const dispatchMutation = useMutation<void, unknown>('post', (input) =>
    `/api/v1/pos/transfers/${(input as unknown as string)}/dispatch`,
  );
  const receiveMutation = useMutation<void, unknown>('post', (input) =>
    `/api/v1/pos/transfers/${(input as unknown as string)}/receive`,
  );

  const columns: Column<Transfer>[] = [
    {
      key: 'number',
      header: 'Transfer #',
      render: (r) => <code className="font-mono text-slate-800">{r.transferNumber}</code>,
    },
    {
      key: 'from',
      header: 'From',
      render: (r) => (
        <div>
          <StatusChip label={r.fromBranch.code} tone="info" />
          <span className="ml-2 text-slate-700 text-[13px]">{r.fromBranch.name}</span>
        </div>
      ),
    },
    {
      key: 'to',
      header: 'To',
      render: (r) => (
        <div>
          <StatusChip label={r.toBranch.code} tone="teal" />
          <span className="ml-2 text-slate-700 text-[13px]">{r.toBranch.name}</span>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      align: 'center',
      render: (r) => <span className="tabular-nums">{r.itemCount}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusChip label={r.status} tone={STATUS_TONE[r.status]} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <>
          {r.status === 'DRAFT' && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await dispatchMutation.mutate(r.id as unknown as void);
                  toast.success('Transfer dispatched');
                  void refetch();
                } catch (e) {
                  toast.error('Failed', e instanceof Error ? e.message : 'Unknown');
                }
              }}
              className="text-[12.5px] font-medium text-sky-700 hover:text-sky-800"
            >
              Dispatch
            </button>
          )}
          {r.status === 'DISPATCHED' && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await receiveMutation.mutate(r.id as unknown as void);
                  toast.success('Transfer received');
                  void refetch();
                } catch (e) {
                  toast.error('Failed', e instanceof Error ? e.message : 'Unknown');
                }
              }}
              className="text-[12.5px] font-medium text-success-700 hover:text-success-600"
            >
              Receive
            </button>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <Link
        href="/inventory"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" /> Back to inventory
      </Link>

      <PageHeader
        title="Inter-branch transfers"
        subtitle="Move stock between branches — DRAFT → DISPATCHED → RECEIVED; total always conserved"
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            <Plus className="w-4 h-4" /> New transfer
          </button>
        }
      />

      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading transfers…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <ArrowRightLeft className="w-8 h-8 mx-auto text-slate-300 mb-3" />
            No transfers yet — create one to move stock between branches.
          </div>
        ) : (
          <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New transfer"
        size="md"
      >
        <p className="text-sm text-slate-600">
          Full create-transfer form (branch picker, variant line items) wires in a follow-up sub-batch.
          The API endpoint <code className="font-mono text-[12.5px]">POST /api/v1/pos/transfers</code> is live.
        </p>
      </Modal>
    </div>
  );
}