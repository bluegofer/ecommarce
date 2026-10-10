'use client';

import { useMemo, useState } from 'react';
import { Wallet, CheckCircle2, AlertCircle, TrendingUp, type LucideIcon } from 'lucide-react';
import { PageHeader, EmptyState, Modal, useToast } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';

interface Settlement {
  id: string;
  courierCode: string;
  periodStart: string;
  periodEnd: string;
  expectedPoisha: number;
  receivedPoisha: number;
  orderCount: number;
  status: string;
  reconciledAt: string | null;
  notes: string | null;
}

type Filter = 'unreconciled' | 'all';

function poisha(v: number) {
  return '৳' + (v / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default function SettlementsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('unreconciled');
  const [target, setTarget] = useState<Settlement | null>(null);
  const [receivedInput, setReceivedInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  const query = useQuery<Settlement[]>(
    filter === 'unreconciled'
      ? '/api/v1/courier/settlements/unreconciled'
      : '/api/v1/courier/settlements/all',
  );

  const markMutation = useMutation<
    { id: string; receivedPoisha: number; notes: string | null },
    unknown
  >('post', (input) => `/api/v1/courier/settlements/${(input as { id: string }).id}/mark-reconciled`);

  const stats = useMemo(() => {
    const list = query.data ?? [];
    return {
      total: list.length,
      expectedTotal: list.reduce((s, r) => s + r.expectedPoisha, 0),
      receivedTotal: list.reduce((s, r) => s + r.receivedPoisha, 0),
      pendingTotal: list
        .filter((r) => r.status !== 'RECONCILED')
        .reduce((s, r) => s + Math.max(0, r.expectedPoisha - r.receivedPoisha), 0),
    };
  }, [query.data]);

  async function submitMark() {
    if (!target) return;
    const received = Math.round(Number(receivedInput) * 100);
    if (!Number.isFinite(received) || received < 0) {
      toast.error('Invalid amount', 'Enter a positive number in ৳');
      return;
    }
    try {
      await markMutation.mutate({
        id: target.id,
        receivedPoisha: received,
        notes: notesInput.trim() || null,
      });
      toast.success('Settlement updated');
      setTarget(null);
      setReceivedInput('');
      setNotesInput('');
      void query.refetch();
    } catch (e) {
      toast.error('Update failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Courier settlements"
        subtitle="COD amounts receivable from couriers — reconcile payouts against orders."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Open settlements" value={String(stats.total)} icon={Wallet} tone="slate" />
        <Stat label="Expected total" value={poisha(stats.expectedTotal)} icon={TrendingUp} tone="sky" />
        <Stat label="Received total" value={poisha(stats.receivedTotal)} icon={CheckCircle2} tone="green" />
        <Stat label="Outstanding" value={poisha(stats.pendingTotal)} icon={AlertCircle} tone="amber" />
      </div>

      <div className="inline-flex rounded border border-border overflow-hidden">
        {(['unreconciled', 'all'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              'px-3 h-9 text-sm font-medium ' +
              (filter === f ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')
            }
          >
            {f === 'unreconciled' ? 'Unreconciled' : 'All'}
          </button>
        ))}
      </div>

      {query.loading && !query.data ? (
        <div className="card p-10 text-center text-slate-400">Loading settlements…</div>
      ) : query.error ? (
        <div className="card p-10 text-center text-danger-700">{query.error.message}</div>
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No settlements"
          description="Courier payout records will appear here once pushed by the courier."
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Courier</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Period</th>
                <th className="text-right px-4 py-2.5 font-semibold text-slate-600">Orders</th>
                <th className="text-right px-4 py-2.5 font-semibold text-slate-600">Expected</th>
                <th className="text-right px-4 py-2.5 font-semibold text-slate-600">Received</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Status</th>
                <th className="text-right px-4 py-2.5 font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {(query.data ?? []).map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 text-slate-800 font-medium">{s.courierCode}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {s.periodStart.slice(0, 10)} → {s.periodEnd.slice(0, 10)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{s.orderCount}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700">{poisha(s.expectedPoisha)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700">{poisha(s.receivedPoisha)}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={s.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setTarget(s);
                        setReceivedInput((s.receivedPoisha / 100).toString());
                        setNotesInput(s.notes ?? '');
                      }}
                      className="inline-flex items-center gap-1 px-2 h-7 rounded text-xs text-sky-700 hover:bg-sky-50"
                    >
                      Reconcile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!target}
        onClose={() => {
          setTarget(null);
          setReceivedInput('');
          setNotesInput('');
        }}
        title="Reconcile settlement"
        size="sm"
      >
        {target && (
          <div className="space-y-4">
            <div className="text-sm text-slate-600">
              <div><strong>Courier:</strong> {target.courierCode}</div>
              <div><strong>Period:</strong> {target.periodStart.slice(0, 10)} → {target.periodEnd.slice(0, 10)}</div>
              <div><strong>Expected:</strong> {poisha(target.expectedPoisha)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Received amount (৳)
              </label>
              <input
                type="number"
                step="0.01"
                value={receivedInput}
                onChange={(e) => setReceivedInput(e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                rows={2}
                className="input w-full"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTarget(null)}
                className="h-9 px-4 rounded border border-border text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitMark}
                className="h-9 px-4 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'RECONCILED'
      ? 'bg-green-100 text-green-700'
      : status === 'PARTIAL'
        ? 'bg-amber-100 text-amber-700'
        : status === 'DISCREPANCY'
          ? 'bg-red-100 text-red-700'
          : 'bg-slate-100 text-slate-600';
  return (
    <span className={'inline-flex items-center px-2 h-6 rounded-full text-[11px] font-semibold ' + cls}>
      {status}
    </span>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: 'slate' | 'green' | 'amber' | 'sky';
}) {
  const map: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    sky: 'bg-sky-100 text-sky-700',
  };
  return (
    <div className="card p-4 flex items-center gap-3">
      <span className={`w-10 h-10 rounded-lg grid place-items-center ${map[tone]}`}>
        <Icon className="w-5 h-5" />
      </span>
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
        <div className="text-lg font-bold text-slate-800">{value}</div>
      </div>
    </div>
  );
}
