'use client';

import {
  TrendingUp,
  ReceiptText,
  PackageX,
  ClipboardCheck,
  ArrowRight,
  RotateCcw,
  Wallet,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useQuery } from '@/lib/hooks';
import { MetricCard } from '@/components/ui/metric-card';
import {
  StatusChip,
  ORDER_STATUS_TONE,
  type StatusTone,
} from '@/components/ui/status-chip';

// ── API shapes (mirror server) ──

interface DashboardResponse {
  today: { grossSalesPoisha: number; ordersCount: number };
  pendingActions: {
    pendingVerification: number;
    lowStockSkus: number;
    returnsAwaiting: number;
    unreconciledSettlements: number;
  };
}

interface SeriesRow {
  date: string;
  ordersCount: number;
  revenuePoisha: number;
  aovPoisha: number;
}

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  totalPoisha: number;
  placedAt: string;
  contactPhone: string;
}

interface OrdersListResponse {
  items: OrderRow[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Formatting ──

function fmtBdt(poisha: number): string {
  return `৳${(poisha / 100).toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function fmtDateTimeShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardHomePage() {
  // 30-day series for the chart
  const chartFrom = new Date(Date.now() - 29 * 86400000)
    .toISOString()
    .slice(0, 10);

  const dashboardQ = useQuery<DashboardResponse>('/api/v1/analytics/dashboard', {
    refreshInterval: 60_000, // 1-min refresh (matches TDD §6.13 "real-time overview")
  });
  const seriesQ = useQuery<SeriesRow[]>(
    `/api/v1/analytics/reports/series?from=${chartFrom}&groupBy=day`,
  );
  const recentQ = useQuery<OrdersListResponse>(
    '/api/v1/orders?page=1&pageSize=5',
  );

  const metrics = [
    {
      label: 'Gross sales (today)',
      value: dashboardQ.data ? fmtBdt(dashboardQ.data.today.grossSalesPoisha) : '—',
      delta: dashboardQ.loading ? 'loading…' : 'real-time',
      icon: TrendingUp,
      tone: 'info' as const,
    },
    {
      label: 'Orders (today)',
      value: dashboardQ.data ? String(dashboardQ.data.today.ordersCount) : '—',
      delta: dashboardQ.loading ? 'loading…' : 'real-time',
      icon: ReceiptText,
      tone: 'teal' as const,
    },
    {
      label: 'Pending verification',
      value: dashboardQ.data
        ? String(dashboardQ.data.pendingActions.pendingVerification)
        : '—',
      delta:
        dashboardQ.data && dashboardQ.data.pendingActions.pendingVerification > 0
          ? 'needs action'
          : 'all clear',
      icon: ClipboardCheck,
      tone: 'warning' as const,
    },
    {
      label: 'Low-stock SKUs',
      value: dashboardQ.data ? String(dashboardQ.data.pendingActions.lowStockSkus) : '—',
      delta:
        dashboardQ.data && dashboardQ.data.pendingActions.lowStockSkus > 0
          ? 'restock soon'
          : 'healthy',
      icon: PackageX,
      tone: 'danger' as const,
    },
  ];

  // Chart data — convert poisha to BDT for readability
  const chartData =
    seriesQ.data?.map((r) => ({
      date: r.date,
      label: fmtDateShort(r.date),
      revenue: Math.round(r.revenuePoisha / 100),
      orders: r.ordersCount,
    })) ?? [];

  const recentOrders = recentQ.data?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time overview · gross sales, orders, verification queue, low-stock alerts
          </p>
        </div>
        <a
          href="/analytics"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-800"
        >
          Open Analytics
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard
            key={m.label}
            label={m.label}
            value={m.value}
            delta={m.delta}
            icon={m.icon}
            tone={m.tone}
          />
        ))}
      </div>

      {/* Sales overview + pending actions (2-col) */}
      <div className="grid gap-4 grid-cols-1 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Sales overview
              </h2>
              <p className="text-[12.5px] text-slate-500">
                Last 30 days · revenue (৳) + order count
              </p>
            </div>
          </div>

          {seriesQ.loading && !seriesQ.data ? (
            <div className="h-64 grid place-items-center rounded border border-dashed border-border bg-slate-50 text-slate-400 text-sm">
              Loading chart…
            </div>
          ) : seriesQ.error ? (
            <div className="h-64 grid place-items-center rounded border border-dashed border-danger-200 bg-danger-50 text-danger-700 text-sm">
              Could not load series data
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 grid place-items-center rounded border border-dashed border-border bg-slate-50 text-slate-400 text-sm">
              No sales data in the last 30 days
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === 'revenue' ? [`৳${value}`, 'Revenue'] : [value, 'Orders']
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

        <div className="card p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Pending actions
          </h2>
          <ul className="space-y-3 text-sm">
            {[
              {
                label: 'Orders awaiting verification',
                count: dashboardQ.data?.pendingActions.pendingVerification ?? 0,
                href: '/orders',
                tone: 'text-sky-700',
                icon: ClipboardCheck,
              },
              {
                label: 'Returns awaiting decision',
                count: dashboardQ.data?.pendingActions.returnsAwaiting ?? 0,
                href: '/returns',
                tone: 'text-warning-700',
                icon: RotateCcw,
              },
              {
                label: 'Unreconciled courier settlements',
                count: dashboardQ.data?.pendingActions.unreconciledSettlements ?? 0,
                href: '/delivery',
                tone: 'text-danger-700',
                icon: Wallet,
              },
              {
                label: 'Low-stock SKUs',
                count: dashboardQ.data?.pendingActions.lowStockSkus ?? 0,
                href: '/inventory/low-stock',
                tone: 'text-danger-700',
                icon: PackageX,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className={`flex items-center justify-between gap-2 py-1 hover:underline ${item.tone}`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon className="w-4 h-4 shrink-0" />
                      {item.label}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="tabular-nums font-semibold">{item.count}</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Recent orders */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Recent orders</h2>
            <p className="text-[12.5px] text-slate-500">
              Latest 5 orders across all channels
            </p>
          </div>
          <a
            href="/orders"
            className="text-sm font-medium text-sky-700 hover:text-sky-800"
          >
            View all
          </a>
        </div>

        {recentQ.loading && !recentQ.data ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : recentQ.error ? (
          <div className="p-10 text-center text-danger-700 text-sm">
            Could not load recent orders
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            No orders yet
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[12px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium">Order</th>
                <th className="text-left px-5 py-2.5 font-medium">Placed</th>
                <th className="text-left px-5 py-2.5 font-medium">Phone</th>
                <th className="text-left px-5 py-2.5 font-medium">Total</th>
                <th className="text-left px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <a
                      href={`/orders/${o.id}`}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      {o.orderNumber}
                    </a>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {fmtDateTimeShort(o.placedAt)}
                  </td>
                  <td className="px-5 py-3 text-slate-600 tabular-nums">
                    {o.contactPhone}
                  </td>
                  <td className="px-5 py-3 text-slate-900 font-medium tabular-nums">
                    {fmtBdt(o.totalPoisha)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusChip
                      label={o.status}
                      tone={(ORDER_STATUS_TONE[o.status] ?? 'neutral') as StatusTone}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}