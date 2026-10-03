'use client';

import { BarChart3, TrendingUp, Users, Store } from 'lucide-react';
import { PageHeader, DataTable, StatusChip } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery } from '@/lib/hooks';
import { formatPoisha } from '@/lib/utils';

interface PLReport {
  revenue: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  netProfit: number;
}

export default function ReportsPage() {
  const pl = useQuery<PLReport>('/api/v1/accounting/reports/profit-and-loss?from=2026-09-01&to=2026-09-30');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        subtitle="Gross/Net profit · Employee performance · Branch performance · CSV export"
      />

      {/* P&L */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Profit & Loss (current month)</h3>
        {pl.loading ? (
          <p className="text-center text-slate-400 py-6">Loading P&L…</p>
        ) : pl.error ? (
          <p className="text-center text-danger-700 py-6">{pl.error.message}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-5">
            <Metric label="Revenue" value={formatPoisha(pl.data?.revenue ?? 0)} />
            <Metric label="COGS" value={formatPoisha(pl.data?.cogs ?? 0)} />
            <Metric label="Gross profit" value={formatPoisha(pl.data?.grossProfit ?? 0)} tone="success" />
            <Metric label="Operating expense" value={formatPoisha(pl.data?.opex ?? 0)} />
            <Metric label="Net profit" value={formatPoisha(pl.data?.netProfit ?? 0)} tone={(pl.data?.netProfit ?? 0) >= 0 ? 'success' : 'danger'} />
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PlaceholderCard title="Employee performance" Icon={Users} description="Per-employee handled orders / tickets / attendance — wired in Batch F" />
        <PlaceholderCard title="Branch performance" Icon={Store} description="Per-branch sales and stock movement — wired in Batch F" />
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' }) {
  const cls = tone === 'success' ? 'text-success-700' : tone === 'danger' ? 'text-danger-700' : 'text-slate-900';
  return (
    <div className="p-3 rounded bg-slate-50 border border-border">
      <p className="text-[11.5px] text-slate-500">{label}</p>
      <p className={`text-base font-semibold tabular-nums mt-0.5 ${cls}`}>{value}</p>
    </div>
  );
}

function PlaceholderCard({ title, Icon, description }: { title: string; Icon: typeof Users; description: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-slate-400" />
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="text-[12.5px] text-slate-500">{description}</p>
    </div>
  );
}