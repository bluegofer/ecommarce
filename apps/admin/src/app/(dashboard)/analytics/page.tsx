'use client';

import { TrendingUp, ReceiptText, Users, Package } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { useQuery } from '@/lib/hooks';
import { formatPoisha } from '@/lib/utils';

interface DailySummary {
  date: string;
  orderCount: number;
  revenuePoisha: number;
  aovPoisha: number;
  newCustomers: number;
}

export default function AnalyticsPage() {
  const { data, loading, error } = useQuery<DailySummary[]>('/api/v1/analytics/summary/daily?days=30');

  const totals = (data ?? []).reduce(
    (acc, d) => ({
      revenue: acc.revenue + d.revenuePoisha,
      orders: acc.orders + d.orderCount,
      customers: acc.customers + d.newCustomers,
    }),
    { revenue: 0, orders: 0, customers: 0 },
  );
  const aov = totals.orders > 0 ? Math.round(totals.revenue / totals.orders) : 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Analytics" subtitle="Last 30 days · first-party data (impossible to ad-block)" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat label="Revenue (30d)" value={formatPoisha(totals.revenue)} Icon={TrendingUp} tone="sky" />
        <Stat label="Orders (30d)" value={String(totals.orders)} Icon={ReceiptText} tone="teal" />
        <Stat label="AOV" value={formatPoisha(aov)} Icon={Package} tone="warning" />
        <Stat label="New customers" value={String(totals.customers)} Icon={Users} tone="success" />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Revenue chart</h3>
          <span className="text-[12px] text-slate-400">recharts wires in Batch F</span>
        </div>
        <div className="h-64 grid place-items-center rounded border border-dashed border-border bg-slate-50 text-slate-400 text-sm">
          {loading ? 'Loading…' : error ? `Error: ${error.message}` : 'Chart placeholder — wire recharts in Batch F'}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h3 className="font-semibold text-slate-900">Daily breakdown</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-border">
            <tr>
              <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 uppercase">Date</th>
              <th className="px-4 py-2 text-right text-[12px] font-semibold text-slate-500 uppercase">Orders</th>
              <th className="px-4 py-2 text-right text-[12px] font-semibold text-slate-500 uppercase">Revenue</th>
              <th className="px-4 py-2 text-right text-[12px] font-semibold text-slate-500 uppercase">AOV</th>
              <th className="px-4 py-2 text-right text-[12px] font-semibold text-slate-500 uppercase">New</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(!data || data.length === 0) ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No data — analytics events populate as orders flow in.</td></tr>
            ) : (
              data.map((d) => (
                <tr key={d.date}>
                  <td className="px-4 py-2 text-slate-700">{d.date}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{d.orderCount}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatPoisha(d.revenuePoisha)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatPoisha(d.aovPoisha)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{d.newCustomers}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, Icon, tone }: { label: string; value: string; Icon: typeof TrendingUp; tone: 'sky'|'teal'|'warning'|'success' }) {
  const toneClass =
    tone === 'sky' ? 'bg-sky-50 text-sky-700'
    : tone === 'teal' ? 'bg-teal-50 text-teal-600'
    : tone === 'warning' ? 'bg-warning-50 text-warning-700'
    : 'bg-success-50 text-success-700';
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12.5px] font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">{value}</p>
        </div>
        <span className={`w-10 h-10 grid place-items-center rounded-lg ${toneClass}`}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
    </div>
  );
}