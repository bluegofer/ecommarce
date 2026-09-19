import {
  TrendingUp,
  ReceiptText,
  PackageX,
  ClipboardCheck,
  ArrowRight,
} from 'lucide-react';

export const metadata = {
  title: 'Dashboard · BlueGofer Admin',
};

// PLACEHOLDER METRICS — real API wiring arrives in Batch E (Step 12 verification).
// Per workflow Step 12 task #40: gross sales / orders / pending verification /
// low-stock cards + sales-overview chart + recent-orders + pending-action lists.
const METRICS = [
  {
    label: 'Gross sales (today)',
    value: '৳0.00',
    delta: '—',
    icon: TrendingUp,
    tone: 'sky' as const,
  },
  {
    label: 'Orders (today)',
    value: '0',
    delta: '—',
    icon: ReceiptText,
    tone: 'teal' as const,
  },
  {
    label: 'Pending verification',
    value: '0',
    delta: 'needs action',
    icon: ClipboardCheck,
    tone: 'warning' as const,
  },
  {
    label: 'Low-stock SKUs',
    value: '0',
    delta: '—',
    icon: PackageX,
    tone: 'danger' as const,
  },
];

const TONE_CLASSES: Record<string, string> = {
  sky: 'bg-sky-50 text-sky-700',
  teal: 'bg-teal-50 text-teal-600',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-700',
};

export default function DashboardHomePage() {
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
        {METRICS.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12.5px] font-medium text-slate-500">
                    {m.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
                    {m.value}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-400">{m.delta}</p>
                </div>
                <span
                  className={`w-10 h-10 grid place-items-center rounded-lg ${TONE_CLASSES[m.tone]}`}
                >
                  <Icon className="w-5 h-5" />
                </span>
              </div>
            </div>
          );
        })}
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
                Last 30 days · chart loads in Batch E with real data
              </p>
            </div>
          </div>
          <div className="h-64 grid place-items-center rounded border border-dashed border-border bg-slate-50 text-slate-400 text-sm">
            Chart placeholder — recharts wired in Batch E
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Pending actions
          </h2>
          <ul className="space-y-3 text-sm">
            {[
              { label: 'Orders awaiting verification', href: '/orders', tone: 'text-sky-700' },
              { label: 'Returns awaiting decision', href: '/returns', tone: 'text-warning-700' },
              { label: 'Unreconciled courier settlements', href: '/delivery', tone: 'text-danger-700' },
              { label: 'Failed jobs / DLQ', href: '/settings/audit-log', tone: 'text-slate-600' },
            ].map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className={`flex items-center justify-between gap-2 py-1 hover:underline ${item.tone}`}
                >
                  <span>{item.label}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent orders (placeholder table) */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Recent orders</h2>
            <p className="text-[12.5px] text-slate-500">
              Live data arrives with the Orders module wiring in Batch E
            </p>
          </div>
          <a
            href="/orders"
            className="text-sm font-medium text-sky-700 hover:text-sky-800"
          >
            View all
          </a>
        </div>
        <div className="p-10 text-center text-slate-400 text-sm">
          No orders yet — real data wires in Batch E
        </div>
      </div>
    </div>
  );
}