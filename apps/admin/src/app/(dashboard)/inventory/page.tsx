'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package, Search, Plus, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, EmptyState, Modal, useToast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';

interface Branch {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
}

interface StockRow {
  id: string;
  variantId: string;
  sku: string;
  productTitle: string;
  quantity: number;
  lowStockThreshold: number;
  branchId: string;
  branchCode: string;
}

export default function InventoryPage() {
  const toast = useToast();
  const [branchId, setBranchId] = useState<string>('');
  const [q, setQ] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [adjustRow, setAdjustRow] = useState<StockRow | null>(null);

  const { data: branches } = useQuery<Branch[]>('/api/v1/pos/branches');

  const effectiveBranch = branchId || branches?.find((b) => b.isDefault)?.id || branches?.[0]?.id || '';

  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (lowOnly) query.set('lowStock', '1');

  const { data, loading, error, refetch } = useQuery<StockRow[]>(
    effectiveBranch
      ? `/api/v1/pos/branches/${effectiveBranch}/stock?${query.toString()}`
      : null,
  );

  // Phase 3.5 — backend AdjustStockDto expects { variantId, delta, reason }
  const adjustMutation = useMutation<
    { variantId: string; delta: number; reason: string },
    unknown
  >('post', '/api/v1/inventory/adjust');

  const columns: Column<StockRow>[] = [
    {
      key: 'product',
      header: 'Product',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800">{row.productTitle}</div>
          <code className="text-[11.5px] text-slate-400 font-mono">{row.sku}</code>
        </div>
      ),
    },
    {
      key: 'qty',
      header: 'Stock',
      align: 'right',
      render: (row) => {
        const isLow = row.quantity <= row.lowStockThreshold;
        return (
          <div className="flex items-center justify-end gap-2">
            <span
              className={`tabular-nums font-medium ${
                isLow ? 'text-warning-700' : 'text-slate-800'
              }`}
            >
              {row.quantity}
            </span>
            {isLow && <AlertTriangle className="w-4 h-4 text-warning-600" />}
          </div>
        );
      },
    },
    {
      key: 'threshold',
      header: 'Threshold',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums text-slate-500">{row.lowStockThreshold}</span>
      ),
    },
    {
      key: 'branch',
      header: 'Branch',
      render: (row) => (
        <StatusChip label={row.branchCode} tone="info" />
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          onClick={() => setAdjustRow(row)}
          className="inline-flex items-center text-[12.5px] font-medium text-sky-700 hover:text-sky-800"
        >
          Adjust
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory"
        subtitle="Branch-wise stock · live grid · audit-trailed adjustments"
        actions={
          <>
            <Link
              href="/inventory/transfers"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Transfers
            </Link>
            <button
              type="button"
              onClick={() => setAdjustRow({} as StockRow)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              <Plus className="w-4 h-4" />
              Quick adjust
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by SKU or product title…"
            className="w-full h-9 pl-9 pr-3 rounded border border-border bg-white text-sm focus:border-sky-400 focus:outline-none"
          />
        </div>
        <select
          value={effectiveBranch}
          onChange={(e) => setBranchId(e.target.value)}
          className="h-9 pl-2 pr-8 rounded border border-border bg-white text-sm text-slate-700 focus:border-sky-400 focus:outline-none"
        >
          {branches?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.isDefault ? '(main)' : ''}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={lowOnly}
            onChange={(e) => setLowOnly(e.target.checked)}
            className="w-4 h-4 rounded border-border text-sky-600"
          />
          Low stock only
        </label>
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
          <div className="p-10 text-center text-slate-400">Loading stock…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No stock rows"
            description="Pick another branch or clear filters."
          />
        ) : (
          <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
        )}
      </div>

      <AdjustModal
        row={adjustRow}
        onClose={() => setAdjustRow(null)}
        onSubmit={async (payload) => {
          try {
            await adjustMutation.mutate(payload);
            toast.success('Stock adjusted');
            setAdjustRow(null);
            void refetch();
          } catch (e) {
            toast.error('Adjust failed', e instanceof Error ? e.message : 'Unknown');
          }
        }}
      />
    </div>
  );
}

function AdjustModal({
  row,
  onClose,
  onSubmit,
}: {
  row: StockRow | null;
  onClose: () => void;
  onSubmit: (p: { variantId: string; delta: number; reason: string }) => void;
}) {
  const [delta, setDelta] = useState('0');
  const [reason, setReason] = useState('CORRECTION');

  if (!row) return null;

  return (
    <Modal
      open={!!row}
      onClose={onClose}
      title="Adjust stock"
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit({ variantId: row.variantId, delta: parseInt(delta, 10) || 0, reason })}
            className="h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            Apply
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          SKU <code className="font-mono">{row.sku}</code> — current stock{' '}
          <strong>{row.quantity}</strong>
        </p>
        <div>
          <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
            Delta (+/-)
          </label>
          <input
            type="number"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            className="w-full h-10 px-3 rounded border border-border bg-white text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
            Reason code
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full h-10 px-3 rounded border border-border bg-white text-sm"
          >
            <option value="RESTOCK">Restock</option>
            <option value="DAMAGE">Damage</option>
            <option value="RETURN">Return</option>
            <option value="CORRECTION">Correction</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}