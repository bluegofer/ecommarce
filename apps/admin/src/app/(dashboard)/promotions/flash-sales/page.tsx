'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Zap, Plus, ArrowLeft } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, EmptyState, useToast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery } from '@/lib/hooks';
import { formatDateTime, formatPoisha } from '@/lib/utils';

interface FlashSale {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  itemCount: number;
  soldCount: number;
  cap: number | null;
  totalRevenuePoisha: number;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
}

export default function FlashSalesPage() {
  const toast = useToast();
  const { data, loading, error } = useQuery<FlashSale[]>('/api/v1/flash-sales');

  const columns: Column<FlashSale>[] = [
    {
      key: 'title',
      header: 'Flash sale',
      render: (r) => <span className="font-medium text-slate-800">{r.title}</span>,
    },
    {
      key: 'window',
      header: 'Window',
      render: (r) => (
        <span className="text-[12.5px] text-slate-500">
          {formatDateTime(r.startsAt)} → {formatDateTime(r.endsAt)}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      align: 'center',
      render: (r) => <span className="tabular-nums">{r.itemCount}</span>,
    },
    {
      key: 'sold',
      header: 'Sold',
      align: 'center',
      render: (r) => (
        <span className="tabular-nums">
          {r.soldCount}
          {r.cap != null ? ` / ${r.cap}` : ''}
        </span>
      ),
    },
    {
      key: 'revenue',
      header: 'Revenue',
      align: 'right',
      render: (r) => (
        <span className="tabular-nums font-medium text-slate-800">
          {formatPoisha(r.totalRevenuePoisha)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <StatusChip
          label={r.status}
          tone={
            r.status === 'LIVE'
              ? 'success'
              : r.status === 'SCHEDULED'
                ? 'info'
                : r.status === 'ENDED'
                  ? 'neutral'
                  : 'danger'
          }
        />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <Link href="/promotions" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> Back to promotions
      </Link>

      <PageHeader
        title="Flash sales"
        subtitle="Auto-start/end at scheduled time · sold-cap enforcement · countdown on deals page"
        actions={
          <button
            type="button"
            onClick={() => toast.push({ tone: 'info', title: 'New flash sale', description: 'Modal in follow-up.' })}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            <Plus className="w-4 h-4" /> New flash sale
          </button>
        }
      />

      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No flash sales yet"
            description="Group products under a timed campaign with live countdown."
          />
        ) : (
          <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
        )}
      </div>
    </div>
  );
}