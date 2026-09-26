'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Tag, Plus, Percent, Gift } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, EmptyState, useToast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery } from '@/lib/hooks';
import { formatPoisha, formatDate } from '@/lib/utils';

interface Coupon {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED' | 'FREE_SHIPPING';
  value: number;
  minOrderPoisha: number | null;
  usageLimit: number | null;
  usedCount: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

export default function PromotionsPage() {
  const toast = useToast();
  const { data, loading, error } = useQuery<Coupon[]>('/api/v1/coupons');

  const columns: Column<Coupon>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (r) => (
        <code className="font-mono font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
          {r.code}
        </code>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          {r.type === 'PERCENT' && <Percent className="w-3.5 h-3.5 text-sky-600" />}
          {r.type === 'FIXED' && <Tag className="w-3.5 h-3.5 text-sky-600" />}
          {r.type === 'FREE_SHIPPING' && <Gift className="w-3.5 h-3.5 text-sky-600" />}
          {r.type === 'PERCENT'
            ? `${r.value}%`
            : r.type === 'FIXED'
              ? formatPoisha(r.value)
              : 'Free shipping'}
        </span>
      ),
    },
    {
      key: 'min',
      header: 'Min order',
      align: 'right',
      render: (r) =>
        r.minOrderPoisha != null ? (
          <span className="tabular-nums text-slate-700">{formatPoisha(r.minOrderPoisha)}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'usage',
      header: 'Used',
      align: 'right',
      render: (r) => (
        <span className="tabular-nums text-slate-700">
          {r.usedCount}
          {r.usageLimit != null ? ` / ${r.usageLimit}` : ''}
        </span>
      ),
    },
    {
      key: 'validity',
      header: 'Validity',
      render: (r) => (
        <span className="text-[12.5px] text-slate-500">
          {formatDate(r.validFrom)} → {formatDate(r.validTo)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        !r.isActive ? (
          <StatusChip label="Disabled" tone="neutral" />
        ) : new Date(r.validTo) < new Date() ? (
          <StatusChip label="Expired" tone="danger" />
        ) : (
          <StatusChip label="Active" tone="success" />
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Promotions"
        subtitle="Coupon codes · automatic discounts · flash sales · referral program"
        actions={
          <>
            <Link
              href="/promotions/discounts"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Auto-discounts
            </Link>
            <Link
              href="/promotions/flash-sales"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Flash sales
            </Link>
            <Link
              href="/promotions/referrals"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Referrals
            </Link>
            <button
              type="button"
              onClick={() => toast.push({ tone: 'info', title: 'New coupon', description: 'Modal in follow-up.' })}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              <Plus className="w-4 h-4" /> New coupon
            </button>
          </>
        }
      />

      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading coupons…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No coupons yet"
            description="Create percentage, fixed-amount, or free-shipping coupons with fine-grained rules."
          />
        ) : (
          <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
        )}
      </div>
    </div>
  );
}