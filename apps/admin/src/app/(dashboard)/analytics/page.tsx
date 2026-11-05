'use client';

import { TrendingUp, ReceiptText, Users, Package } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '@/components/ui';
import { useQuery } from '@/lib/hooks';
import { formatPoisha } from '@/lib/utils';

// ── API shapes (mirror apps/api/modules/analytics) ──

// GET /analytics/summary/daily → DailySalesSummary rows
interface DailySummaryRow {
  date: string;
  ordersCount: number;        // ← API key has 's' (was 'orderCount' before — BUG)
  paidOrdersCount: number;
  revenuePoisha: number;
  refundedPoisha: number;
  aovPoisha: number;
  uniqueCustomers: number;
  repeatCustomers: number;
  newCustomers: number;
  returnedOrders: number;
}

// GET /analytics/reports/sales → aggregate
interface SalesReport {
  from: string;
  to: string;
  ordersCount: number;
  paidOrdersCount: number;
  revenuePoisha: number;
  refundedPoisha: number;
  aovPoisha: number;
  newCustomers: number;
  repeatCustomers: number;
  returnedOrders: number;
}

export default function AnalyticsPage() {
  // Aggregate totals (last 30 days) — the report endpoint is authoritative.
  const reportQ = useQuery<SalesReport>(
    '/api/v1/analytics/reports/sales',
    { refreshInterval: 60_000 },
  );

  // Daily rows for chart + table — summary rows are materialized hourly.
  const dailyQ = useQuery<DailySummaryRow[]>(
    '/api/v1/analytics/summary/daily',
    { refreshInterval: 60_000 },
  );

  // Sort by date desc for the table, asc for the chart
  const dailyAsc = [...(dailyQ.data ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const dailyDesc = [...dailyAsc].reverse();

  // Chart data — poisha → BDT for readability
  const chartData = dailyAsc.map((r) => ({
    date: r.date.slice(0, 10),
    label: new Date(r.date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    }),
    revenue: Math.round(r.revenuePoisha / 100),
    orders: r.ordersCount,
  }));

  // Fallback totals from daily rows if report endpoint fails
  const totalsFromDaily = dailyAsc.reduce(
    (acc, d) => ({
      revenue: acc.revenue + d.revenuePoisha,
      orders: acc.orders + d.ordersCount,
      customers: acc.customers + d.newCustomers,
    }),
    { revenue: 0, orders: 0, customers: 0 },
  );

  const revenuePoisha = reportQ.data?.revenuePoisha ?? totalsFromDaily.revenue;
  const ordersCount = reportQ.data?.ordersCount ?? totalsFromDaily.orders;
  const aovPoisha =
    reportQ.data?.aovPoisha ??
    (ordersCount > 0 ? Math.floor(revenuePoisha / ordersCount) : 0);
  const newCustomers = reportQ.data?.newCustomers ?? totalsFromDaily.customers;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        subtitle="Last 30 days · first-party data (impossible to ad-block)"
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat
          label="Revenue (30d)"
          value={reportQ.loading && !reportQ.data ? '…' : formatPoisha(revenuePoisha)}
          Icon={TrendingUp}
          tone="sky"
        />
        <Stat
          label="Orders (30d)"
          value={reportQ.loading && !reportQ.data ? '…' : String(ordersCount)}
          Icon={ReceiptText}
          tone="teal"
        />
        <Stat
          label="AOV"
          value={reportQ.loading && !reportQ.data ? '…' : formatPoisha(aovPoisha)}
          Icon={Package}
          tone="warning"
        />
        <Stat
          label="New customers"
          value={reportQ.loading && !reportQ.data ? '…' : String(newCustomers)}
          Icon={Users}
          tone="success"
        />
      </div>

      {/* Revenue chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-900">Revenue chart</h3>
            <p className="text-[12px] text-slate-400 mt-0.5">
              Last {dailyAsc.length || 30} days · revenue (৳) + order count
            </p>
          </div>
        </div>

        {dailyQ.loading && !dailyQ.data ? (
          <div className="h-64 grid place-items-center rounded border border-dashed border-border bg-slate-50 text-slate-400 text-sm">
            Loading chart…
          </div>
        ) : dailyQ.error ? (
          <div className="h-64 grid place-items-center rounded border border-dashed border-danger-200 bg-danger-50 text-danger-700 text-sm">
            Could not load series: {dailyQ.error.message}
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 grid place-items-center rounded border border-dashed border-border bg-slate-50 text-slate-400 text-sm">
            No sales data in the last 30 days
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === 'revenue'
                      ? [`৳${value}`, 'Revenue']
                      : [value, 'Orders']
                  }
                  labelStyle={{ fontSize: 12 }}
                  contentStyle={{ fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Daily breakdown */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h3 className="font-semibold text-slate-900">Daily breakdown</h3>
          <p className="text-[12px] text-slate-400 mt-0.5">
            Latest first · {dailyDesc.length} days
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-border">
            <tr>
              <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 uppercase">
                Date
              </th>
              <th className="px-4 py-2 text-right text-[12px] font-semibold text-slate-500 uppercase">
                Orders
              </th>
              <th className="px-4 py-2 text-right text-[12px] font-semibold text-slate-500 uppercase">
                Revenue
              </th>
              <th className="px-4 py-2 text-right text-[12px] font-semibold text-slate-500 uppercase">
                AOV
              </th>
              <th className="px-4 py-2 text-right text-[12px] font-semibold text-slate-500 uppercase">
                New
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {dailyQ.loading && !dailyQ.data ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : dailyQ.error ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-danger-700">
                  Error: {dailyQ.error.message}
                </td>
              </tr>
            ) : dailyDesc.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No data — daily summary populates hourly as orders flow in.
                </td>
              </tr>
            ) : (
              dailyDesc.map((d) => (
                <tr key={d.date} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700 tabular-nums">
                    {new Date(d.date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {d.ordersCount}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">
                    {formatPoisha(d.revenuePoisha)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                    {formatPoisha(d.aovPoisha)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                    {d.newCustomers}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  Icon,
  tone,
}: {
  label: string;
  value: string;
  Icon: typeof TrendingUp;
  tone: 'sky' | 'teal' | 'warning' | 'success';
}) {
  const toneClass =
    tone === 'sky'
      ? 'bg-sky-50 text-sky-700'
      : tone === 'teal'
        ? 'bg-teal-50 text-teal-600'
        : tone === 'warning'
          ? 'bg-warning-50 text-warning-700'
          : 'bg-success-50 text-success-700';
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12.5px] font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">
            {value}
          </p>
        </div>
        <span className={`w-10 h-10 grid place-items-center rounded-lg ${toneClass}`}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
    </div>
  );
}