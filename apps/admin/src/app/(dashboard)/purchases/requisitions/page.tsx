'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, EmptyState, useToast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery } from '@/lib/hooks';
import { formatDate } from '@/lib/utils';

interface Requisition {
  id: string;
  requisitionNumber: string;
  branch: { code: string; name: string };
  requestedBy: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_PO';
  itemCount: number;
  createdAt: string;
}

const STATUS_TONE: Record<Requisition['status'], 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'danger',
  CONVERTED_TO_PO: 'teal' as never,
};

export default function RequisitionsPage() {
  const toast = useToast();
  const { data, loading, error } = useQuery<Requisition[]>('/api/v1/purchase/requisitions');

  const columns: Column<Requisition>[] = [
    { key: 'num', header: 'Requisition #', render: (r) => <code className="font-mono text-slate-800">{r.requisitionNumber}</code> },
    { key: 'branch', header: 'Branch', render: (r) => <StatusChip label={r.branch.code} tone="info" /> },
    { key: 'by', header: 'Requested by', render: (r) => <span className="text-slate-700">{r.requestedBy}</span> },
    { key: 'items', header: 'Items', align: 'center', render: (r) => <span className="tabular-nums">{r.itemCount}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusChip label={r.status.replace(/_/g, ' ')} tone={STATUS_TONE[r.status] ?? 'neutral'} /> },
    { key: 'created', header: 'Created', render: (r) => <span className="text-[12.5px] text-slate-500">{formatDate(r.createdAt)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase Requisitions"
        subtitle="PR → PO → GRN workflow · stock + supplier AP posts in one transaction on GRN"
        actions={
          <>
            <Link href="/purchases/orders" className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">
              Purchase Orders
            </Link>
            <Link href="/purchases/receiving" className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">
              Receiving (GRN)
            </Link>
            <button
              type="button"
              onClick={() => toast.push({ tone: 'info', title: 'New requisition', description: 'Modal in follow-up.' })}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              <Plus className="w-4 h-4" /> New PR
            </button>
          </>
        }
      />

      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading requisitions…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={FileText} title="No requisitions yet" description="Start the procurement cycle with a PR." />
        ) : (
          <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
        )}
      </div>
    </div>
  );
}