'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Phone, Mail, MapPin, CreditCard, TrendingUp, Package } from 'lucide-react';
import { PageHeader, StatusChip, Modal, useToast } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';
import { formatPoisha, formatDateTime } from '@/lib/utils';

interface SupplierDetail {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: { line1?: string; city?: string } | null;
  taxId: string | null;
  paymentTerms: string | null;
  notes: string | null;
  openingBalance: number;
  currentDue: number;
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
  payments: Array<{
    id: string;
    paymentNumber: string;
    amount: number;
    method: string;
    reference: string | null;
    paidAt: string;
    notes: string | null;
  }>;
  dues: Array<{
    id: string;
    amount: number;
    paidAmount: number;
    balance: number;
    dueDate: string | null;
    status: string;
  }>;
}

interface PerformanceDto {
  totalOrders: number;
  totalOrdered: number;
  totalReceived: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  averageLeadTimeDays: number;
  fulfillmentRate: number;
}

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const id = params.id;

  const q = useQuery<SupplierDetail>(id ? `/api/v1/suppliers/${id}` : null);
  const perfQuery = useQuery<PerformanceDto>(id ? `/api/v1/suppliers/${id}/performance` : null);

  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CASH' | 'BANK' | 'MFS'>('BANK');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const payMutation = useMutation<
    { supplierId: string; amount: number; method: string; reference?: string | undefined; notes?: string | undefined },
    unknown
  >('post', '/api/v1/suppliers/payments');

  if (q.loading && !q.data) return <div className="p-10 text-center text-slate-400">Loading supplier…</div>;
  if (q.error || !q.data) {
    return (
      <div className="p-10 text-center">
        <p className="font-medium text-danger-700">Supplier not found</p>
        <Link href="/suppliers" className="mt-4 inline-block text-sky-700 font-medium hover:underline">← Back</Link>
      </div>
    );
  }

  const s = q.data;

  async function handlePayment() {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      await payMutation.mutate({
        supplierId: s.id,
        amount: Math.round(amt * 100),
        method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success('Payment recorded', 'Ledger updated + balance reduced');
      setPayOpen(false);
      setAmount('');
      setReference('');
      setNotes('');
      void q.refetch();
    } catch (e) {
      toast.error('Payment failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  return (
    <div className="space-y-5">
      <Link href="/suppliers" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> Back to suppliers
      </Link>

      <PageHeader
        title={s.name}
        subtitle={`Code ${s.code} · ${s.paymentTerms ?? 'No payment terms'}`}
        actions={
          <>
            <StatusChip
              label={s.status}
              tone={s.status === 'ACTIVE' ? 'success' : s.status === 'BLACKLISTED' ? 'danger' : 'neutral'}
            />
            <button
              type="button"
              onClick={() => setPayOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              <CreditCard className="w-4 h-4" /> Record payment
            </button>
          </>
        }
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-[11.5px] text-slate-500 mb-1">Current Due</div>
          <div className={`text-xl font-semibold tabular-nums ${s.currentDue > 0 ? 'text-danger-700' : 'text-slate-800'}`}>
            {formatPoisha(s.currentDue)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[11.5px] text-slate-500 mb-1">Payments</div>
          <div className="text-xl font-semibold text-slate-800">{s.payments.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-[11.5px] text-slate-500 mb-1">Open Dues</div>
          <div className="text-xl font-semibold text-slate-800">{s.dues.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-[11.5px] text-slate-500 mb-1">Fulfillment</div>
          <div className="text-xl font-semibold text-slate-800">
            {perfQuery.data ? Math.round(perfQuery.data.fulfillmentRate * 100) + '%' : '—'}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Main: payments + performance */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="font-semibold text-slate-900">Payment history</h3>
            </div>
            {s.payments.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No payments yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-border">
                  <tr>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase">Payment #</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase">Method</th>
                    <th className="px-4 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {s.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2.5 font-mono text-slate-700 text-[12px]">{p.paymentNumber}</td>
                      <td className="px-4 py-2.5 text-slate-600 text-[12.5px]">{formatDateTime(p.paidAt)}</td>
                      <td className="px-4 py-2.5">
                        <StatusChip label={p.method} tone="info" />
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium text-success-700">
                        {formatPoisha(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {perfQuery.data && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-400" /> Performance
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-[11.5px] text-slate-500">Total Orders</div>
                  <div className="font-medium text-slate-800">{perfQuery.data.totalOrders}</div>
                </div>
                <div>
                  <div className="text-[11.5px] text-slate-500">On-time</div>
                  <div className="font-medium text-success-700">{perfQuery.data.onTimeDeliveries}</div>
                </div>
                <div>
                  <div className="text-[11.5px] text-slate-500">Late</div>
                  <div className="font-medium text-warning-700">{perfQuery.data.lateDeliveries}</div>
                </div>
                <div>
                  <div className="text-[11.5px] text-slate-500">Avg Lead Time</div>
                  <div className="font-medium text-slate-800">{perfQuery.data.averageLeadTimeDays} days</div>
                </div>
                <div>
                  <div className="text-[11.5px] text-slate-500">Ordered Qty</div>
                  <div className="font-medium text-slate-800">{perfQuery.data.totalOrdered}</div>
                </div>
                <div>
                  <div className="text-[11.5px] text-slate-500">Received Qty</div>
                  <div className="font-medium text-slate-800">{perfQuery.data.totalReceived}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: contact + dues */}
        <aside className="space-y-4">
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-slate-900">Contact</h3>
            {s.contactPerson && (
              <div className="text-sm text-slate-700">{s.contactPerson}</div>
            )}
            {s.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono text-slate-600">{s.phone}</span>
              </div>
            )}
            {s.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-600 text-[12.5px] truncate">{s.email}</span>
              </div>
            )}
            {s.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                <span className="text-slate-600 text-[12.5px]">
                  {[s.address.line1, s.address.city].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
            {s.taxId && (
              <div className="text-[12px] text-slate-500 pt-2 border-t border-border">
                Tax ID: <span className="font-mono">{s.taxId}</span>
              </div>
            )}
          </div>

          {s.dues.length > 0 && (
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" /> Open dues
              </h3>
              {s.dues.map((d) => (
                <div key={d.id} className="text-sm border-t border-border pt-2 first:border-0 first:pt-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-slate-600 text-[12.5px]">Balance</span>
                    <span className="font-medium text-danger-700 tabular-nums">{formatPoisha(d.balance)}</span>
                  </div>
                  {d.dueDate && (
                    <div className="text-[11px] text-slate-400">Due {new Date(d.dueDate).toLocaleDateString()}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {s.notes && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-2">Notes</h3>
              <p className="text-[12.5px] text-slate-600 whitespace-pre-wrap">{s.notes}</p>
            </div>
          )}
        </aside>
      </div>

      {/* Payment modal */}
      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Record payment"
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setPayOpen(false)} className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700">Cancel</button>
            <button
              type="button"
              onClick={() => void handlePayment()}
              disabled={payMutation.loading}
              className="h-9 px-4 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
            >
              {payMutation.loading ? 'Recording…' : 'Record payment'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="text-[13px] text-slate-600">
            Current due: <strong>{formatPoisha(s.currentDue)}</strong>
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1">Amount (৳) *</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full h-10 px-3 rounded border border-border text-sm"
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1">Method *</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as 'CASH' | 'BANK' | 'MFS')}
              className="w-full h-10 px-3 rounded border border-border bg-white text-sm"
            >
              <option value="BANK">Bank Transfer</option>
              <option value="CASH">Cash</option>
              <option value="MFS">MFS (bKash/Nagad/Rocket)</option>
            </select>
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1">Reference (optional)</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Transaction ID / cheque number"
              className="w-full h-10 px-3 rounded border border-border text-sm"
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full p-3 rounded border border-border text-sm"
            />
          </div>
          <p className="text-[11.5px] text-slate-500">
            Ledger auto-posts: Dr 2000-AP / Cr Cash-Bank-MFS. Supplier balance auto-reduced.
          </p>
        </div>
      </Modal>
    </div>
  );
}
