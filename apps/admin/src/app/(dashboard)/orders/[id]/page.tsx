'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, Package, Truck, Home, XCircle, RefreshCcw, Bike,
} from 'lucide-react';
import { PageHeader, StatusChip, ORDER_STATUS_TONE, useToast } from '@/components/ui';
import type { StatusTone } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';
import { formatPoisha, formatDateTime } from '@/lib/utils';

interface OrderLine {
  id: string;
  sku: string;
  title: string;
  quantity: number;
  unitPricePoisha: number;
  lineTotalPoisha: number;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  phone: string;
  shippingAddress: string;
  zone: string;
  subtotalPoisha: number;
  deliveryPoisha: number;
  discountPoisha: number;
  totalPoisha: number;
  paymentMethod: string;
  paymentStatus: string;
  courier: string | null;
  trackingNumber: string | null;
  riderName: string | null;
  items: OrderLine[];
  createdAt: string;
  statusHistory: Array<{ status: string; at: string; by: string; note?: string }>;
}

const NEXT_STATUS: Record<string, string> = {
  PENDING_VERIFICATION: 'VERIFIED',
  VERIFIED: 'PROCESSING',
  PROCESSING: 'SHIPPED',
  SHIPPED: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
};

const MANUAL_STATUSES = [
  { value: 'IN_TRANSIT', label: 'In Transit', cls: 'border-sky-300 text-sky-700 hover:bg-sky-50' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', cls: 'border-amber-300 text-amber-700 hover:bg-amber-50' },
  { value: 'DELIVERED', label: 'Delivered', cls: 'border-success-300 text-success-700 hover:bg-success-50' },
  { value: 'FAILED', label: 'Failed', cls: 'border-danger-300 text-danger-700 hover:bg-danger-50' },
  { value: 'RETURNED', label: 'Returned', cls: 'border-slate-300 text-slate-700 hover:bg-slate-50' },
] as const;

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const orderId = params?.id;

  const { data, loading, error, refetch } = useQuery<OrderDetail>(
    orderId ? `/api/v1/orders/${orderId}` : null,
  );

  const verifyMutation = useMutation<void, unknown>('post', `/api/v1/orders/${orderId}/verify`);
  const statusMutation = useMutation<{ status: string }, unknown>(
    'patch',
    `/api/v1/orders/${orderId}/status`,
  );
  const exchangeMutation = useMutation<{ reason: string }, unknown>(
    'post',
    `/api/v1/orders/${orderId}/exchange`,
  );
  const riderMutation = useMutation<{ riderName: string; riderPhone?: string }, unknown>(
    'patch',
    `/api/v1/orders/${orderId}/rider`,
  );
  const noteMutation = useMutation<{ body: string; isCustomerVisible: boolean }, unknown>(
    'post',
    `/api/v1/orders/${orderId}/notes`,
  );

  const [note, setNote] = useState('');
  const [noteVisible, setNoteVisible] = useState(false);
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');

  if (loading && !data) return <div className="p-10 text-center text-slate-400">Loading order…</div>;
  if (error || !data) {
    return (
      <div className="p-10 text-center">
        <p className="font-medium text-danger-700">Order not found</p>
        <p className="text-sm text-slate-500 mt-1">{error?.message}</p>
        <Link href="/orders" className="mt-4 inline-block text-sky-700 font-medium hover:underline">← Back to orders</Link>
      </div>
    );
  }

  const nextStatus = NEXT_STATUS[data.status];

  return (
    <div className="space-y-5">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" /> Back to orders
      </Link>

      <PageHeader
        title={`Order ${data.orderNumber}`}
        subtitle={`Placed ${formatDateTime(data.createdAt)} · ${data.customerName} · ${data.phone}`}
        actions={
          <>
            <StatusChip
              label={data.status.replace(/_/g, ' ')}
              tone={(ORDER_STATUS_TONE[data.status] ?? 'neutral') as StatusTone}
            />
            {data.status === 'PENDING_VERIFICATION' && (
              <button
                type="button"
                onClick={async () => {
                  await verifyMutation.mutate(undefined as unknown as void);
                  toast.success('Order verified');
                  void refetch();
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-success-600 text-white text-sm font-medium hover:bg-success-700"
              >
                <CheckCircle2 className="w-4 h-4" /> Verify
              </button>
            )}
            {nextStatus && data.status !== 'PENDING_VERIFICATION' && (
              <button
                type="button"
                onClick={async () => {
                  await statusMutation.mutate({ status: nextStatus });
                  toast.success(`Marked ${nextStatus.replace(/_/g, ' ')}`);
                  void refetch();
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
              >
                Move to {nextStatus.replace(/_/g, ' ')}
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                await exchangeMutation.mutate({ reason: 'Customer request' });
                toast.success('Marked for exchange');
                void refetch();
              }}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw className="w-4 h-4" /> Exchange
            </button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: items + timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="font-semibold text-slate-900">Items ({data.items.length})</h3>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {data.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{it.title}</div>
                      <code className="text-[11.5px] text-slate-400 font-mono">{it.sku}</code>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-600">
                      × {it.quantity}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium text-slate-800">
                      {formatPoisha(it.lineTotalPoisha)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Status timeline</h3>
            <ol className="space-y-3">
              {data.statusHistory.map((h, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-5 h-5 mt-0.5 grid place-items-center rounded-full bg-sky-100 text-sky-700 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-sky-600" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-slate-800">
                      {h.status.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[12px] text-slate-500">
                      {formatDateTime(h.at)} · {h.by}
                      {h.note && ` — ${h.note}`}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Internal note (customer-visible flag)</h3>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Called customer — confirm address"
              className="w-full p-3 rounded border border-border bg-white text-sm focus:border-sky-400 focus:outline-none"
            />
            <div className="mt-3 flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-[12.5px] text-slate-600">
                <input
                  type="checkbox"
                  checked={noteVisible}
                  onChange={(e) => setNoteVisible(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                Customer-visible
              </label>
              <button
                type="button"
                disabled={!note || noteMutation.loading}
                onClick={async () => {
                  try {
                    await noteMutation.mutate({ body: note, isCustomerVisible: noteVisible });
                    setNote('');
                    setNoteVisible(false);
                    toast.success('Note saved');
                    void refetch();
                  } catch {
                    toast.error('Could not save note');
                  }
                }}
                className="ml-auto h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
              >
                {noteMutation.loading ? 'Saving…' : 'Save note'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: summary */}
        <aside className="space-y-4">
          <div className="card p-5 space-y-3 text-sm">
            <h3 className="font-semibold text-slate-900">Summary</h3>
            <Row label="Subtotal" value={formatPoisha(data.subtotalPoisha)} />
            <Row label="Delivery" value={formatPoisha(data.deliveryPoisha)} />
            {data.discountPoisha > 0 && (
              <Row label="Discount" value={`−${formatPoisha(data.discountPoisha)}`} tone="success" />
            )}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="text-lg font-semibold text-slate-900 tabular-nums">
                {formatPoisha(data.totalPoisha)}
              </span>
            </div>
          </div>

          <div className="card p-5 space-y-3 text-sm">
            <h3 className="font-semibold text-slate-900">Shipping</h3>
            <p className="text-slate-700">{data.customerName}</p>
            <p className="text-slate-500 font-mono text-[12.5px]">{data.phone}</p>
            <p className="text-slate-600 text-[13px]">{data.shippingAddress}</p>
            <StatusChip label={data.zone} tone="info" />
          </div>

          <div className="card p-5 space-y-3 text-sm">
            <h3 className="font-semibold text-slate-900">Delivery</h3>
            <Row label="Payment" value={data.paymentMethod} />
            <Row label="Payment status" value={data.paymentStatus} />
            <Row label="Courier" value={data.courier ?? '—'} />
            <Row label="Tracking" value={data.trackingNumber ?? '—'} />
            {data.riderName && <Row label="Rider" value={data.riderName} />}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Assign rider</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Bike className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  placeholder="Rider name"
                  className="flex-1 h-9 px-3 rounded border border-border bg-white text-sm"
                />
              </div>
              <input
                type="tel"
                value={riderPhone}
                onChange={(e) => setRiderPhone(e.target.value)}
                placeholder="Rider phone (optional)"
                className="w-full h-9 px-3 rounded border border-border bg-white text-sm"
              />
              <button
                type="button"
                disabled={!riderName || riderMutation.loading}
                onClick={async () => {
                  try {
                    await riderMutation.mutate(riderPhone ? { riderName, riderPhone } : { riderName });
                    toast.success('Rider assigned');
                    setRiderName('');
                    setRiderPhone('');
                    void refetch();
                  } catch {
                    toast.error('Could not assign rider');
                  }
                }}
                className="w-full h-9 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
              >
                {riderMutation.loading ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Manual delivery status</h3>
            <p className="text-[12px] text-slate-500 mb-3">Set by staff (TDD A.4). Courier sync will not override.</p>
            <div className="flex flex-wrap gap-2">
              {MANUAL_STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  disabled={data.status === s.value || statusMutation.loading}
                  onClick={async () => {
                    try {
                      await statusMutation.mutate({ status: s.value });
                      toast.success('Marked ' + s.label);
                      void refetch();
                    } catch {
                      toast.error('Could not set ' + s.label);
                    }
                  }}
                  className={'h-9 px-3 rounded text-sm font-medium border ' + s.cls + ' disabled:opacity-40'}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success';
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`tabular-nums ${tone === 'success' ? 'text-success-700' : 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  );
}
