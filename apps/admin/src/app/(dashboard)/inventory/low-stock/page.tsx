'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { PageHeader, DataTable, StatusChip } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery } from '@/lib/hooks';

interface LowStockRow {
  id: string;
  sku: string;
  productTitle: string;
  stock: number;
  threshold: number;
}

export default function LowStockPage() {
  const { data, loading, error } = useQuery<LowStockRow[]>(
    '/api/v1/inventory/low-stock',
  );

  const columns: Column<LowStockRow>[] = [
    {
      key: 'product',
      header: 'Product',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-800">{r.productTitle}</div>
          <code className="text-[11.5px] text-slate-400 font-mono">{r.sku}</code>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      render: (r) => (
        <span className="font-medium text-warning-700 tabular-nums">{r.stock}</span>
      ),
    },
    {
      key: 'threshold',
      header: 'Threshold',
      align: 'right',
      render: (r) => <span className="tabular-nums text-slate-500">{r.threshold}</span>,
    },
    {
      key: 'urgency',
      header: 'Urgency',
      render: (r) =>
        r.stock === 0 ? (
          <StatusChip label="Out of stock" tone="danger" />
        ) : r.stock <= Math.floor(r.threshold / 2) ? (
          <StatusChip label="Critical" tone="danger" />
        ) : (
          <StatusChip label="Low" tone="warning" />
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
        title="Low-stock alerts"
        subtitle="SKUs at or below their per-variant threshold — restock or transfer to replenish"
      />

      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <div className="p-10 text-center text-success-700">
            <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-success-500" />
            All SKUs are above threshold. Nice!
          </div>
        ) : (
          <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
        )}
      </div>
    </div>
  );
}