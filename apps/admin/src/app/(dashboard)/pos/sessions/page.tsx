'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Banknote, Lock, Unlock, Plus, Minus } from 'lucide-react';
import { PageHeader, StatusChip, Modal, useToast } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';
import { formatPoisha, formatDateTime } from '@/lib/utils';

interface Session {
  id: string;
  register: { id: string; name: string; branch: { code: string } };
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
  openingBalance: number;
  expectedBalance: number | null;
  countedBalance: number | null;
  variance: number | null;
}

export default function PosSessionsPage() {
  const toast = useToast();
  const [cashEvent, setCashEvent] = useState<{ sessionId: string; type: 'CASH_IN' | 'CASH_OUT' } | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [closeTarget, setCloseTarget] = useState<Session | null>(null);
  const [counted, setCounted] = useState('');
  const [varianceNote, setVarianceNote] = useState('');

  const { data, loading, error, refetch } = useQuery<Session[]>('/api/v1/pos/sessions');

  const cashMutation = useMutation<
    { id: string; type: string; amount: number; reason: string | undefined },
    unknown
  >('post', (input) => `/api/v1/pos/sessions/${(input as { id: string }).id}/cash-event`);
  const closeMutation = useMutation<
    { id: string; countedBalance: number; varianceNote: string | undefined },
    unknown
  >('post', (input) => `/api/v1/pos/sessions/${(input as { id: string }).id}/close`);

  return (
    <div className="space-y-5">
      <Link href="/pos" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> Back to register
      </Link>

      <PageHeader
        title="POS Sessions"
        subtitle="Cash drawer · open / cash-in / cash-out / close with variance approval"
      />

      <div className="space-y-3">
        {loading && !data ? (
          <div className="card p-10 text-center text-slate-400">Loading sessions…</div>
        ) : error ? (
          <div className="card p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <div className="card p-10 text-center text-slate-400">No sessions yet — open one from the register.</div>
        ) : (
          data.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">{s.register.name}</span>
                    <StatusChip label={s.register.branch.code} tone="info" />
                    <StatusChip
                      label={s.status}
                      tone={s.status === 'OPEN' ? 'success' : 'neutral'}
                    />
                  </div>
                  <p className="text-[12.5px] text-slate-500">
                    Opened {formatDateTime(s.openedAt)}
                    {s.closedAt && ` · Closed ${formatDateTime(s.closedAt)}`}
                  </p>
                </div>
                {s.status === 'OPEN' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCashEvent({ sessionId: s.id, type: 'CASH_IN' });
                        setAmount('');
                        setReason('');
                      }}
                      className="inline-flex items-center gap-1 h-9 px-3 rounded border border-success-200 bg-success-50 text-success-700 text-[12.5px] font-medium hover:bg-success-100"
                    >
                      <Plus className="w-3.5 h-3.5" /> Cash in
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCashEvent({ sessionId: s.id, type: 'CASH_OUT' });
                        setAmount('');
                        setReason('');
                      }}
                      className="inline-flex items-center gap-1 h-9 px-3 rounded border border-warning-200 bg-warning-50 text-warning-700 text-[12.5px] font-medium hover:bg-warning-100"
                    >
                      <Minus className="w-3.5 h-3.5" /> Cash out
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCloseTarget(s);
                        setCounted('');
                        setVarianceNote('');
                      }}
                      className="inline-flex items-center gap-1 h-9 px-3 rounded bg-sky-600 text-white text-[12.5px] font-medium hover:bg-sky-700"
                    >
                      <Lock className="w-3.5 h-3.5" /> Close session
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Metric label="Opening" value={formatPoisha(s.openingBalance)} />
                {s.expectedBalance != null && (
                  <Metric label="Expected" value={formatPoisha(s.expectedBalance)} />
                )}
                {s.countedBalance != null && (
                  <Metric label="Counted" value={formatPoisha(s.countedBalance)} />
                )}
                {s.variance != null && (
                  <Metric
                    label="Variance"
                    value={formatPoisha(s.variance)}
                    tone={s.variance === 0 ? 'success' : Math.abs(s.variance) > 10000 ? 'danger' : 'warning'}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cash event modal */}
      <Modal
        open={!!cashEvent}
        onClose={() => setCashEvent(null)}
        title={cashEvent?.type === 'CASH_IN' ? 'Cash in' : 'Cash out'}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCashEvent(null)}
              className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!amount || parseInt(amount, 10) <= 0}
              onClick={async () => {
                if (!cashEvent) return;
                await cashMutation.mutate({
                  id: cashEvent.sessionId,
                  type: cashEvent.type,
                  amount: parseInt(amount, 10),
                  reason,
                });
                toast.success('Recorded');
                setCashEvent(null);
                void refetch();
              }}
              className="h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
            >
              Save
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full h-10 px-3 rounded border border-border bg-white text-base tabular-nums text-right"
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Reason (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-10 px-3 rounded border border-border bg-white text-sm"
            />
          </div>
        </div>
      </Modal>

      {/* Close session modal */}
      <Modal
        open={!!closeTarget}
        onClose={() => setCloseTarget(null)}
        title="Close session"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCloseTarget(null)}
              className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!counted}
              onClick={async () => {
                if (!closeTarget) return;
                try {
                  await closeMutation.mutate({
                    id: closeTarget.id,
                    countedBalance: parseInt(counted, 10),
                    varianceNote,
                  });
                  toast.success('Session closed');
                  setCloseTarget(null);
                  void refetch();
                } catch (e) {
                  toast.error('Close failed', e instanceof Error ? e.message : 'Unknown');
                }
              }}
              className="h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
            >
              Close session
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded bg-slate-50 border border-border">
            <Banknote className="w-5 h-5 text-slate-400" />
            <div className="text-sm">
              <div className="text-slate-500">Expected balance</div>
              <div className="font-semibold tabular-nums text-slate-900">
                {closeTarget ? formatPoisha(closeTarget.expectedBalance ?? 0) : '—'}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Counted balance</label>
            <input
              type="number"
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              className="w-full h-10 px-3 rounded border border-border bg-white text-base tabular-nums text-right"
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Variance note</label>
            <input
              type="text"
              value={varianceNote}
              onChange={(e) => setVarianceNote(e.target.value)}
              placeholder="Explain any variance…"
              className="w-full h-10 px-3 rounded border border-border bg-white text-sm"
            />
          </div>
          <p className="text-[11.5px] text-slate-400">
            Variance above ৳100 requires manager approval (enforced server-side).
          </p>
        </div>
      </Modal>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success' | 'warning' | 'danger';
}) {
  const toneClass = tone
    ? tone === 'success'
      ? 'text-success-700'
      : tone === 'warning'
        ? 'text-warning-700'
        : 'text-danger-700'
    : 'text-slate-800';
  return (
    <div className="p-3 rounded bg-slate-50 border border-border">
      <div className="text-[11.5px] text-slate-500">{label}</div>
      <div className={`text-base font-semibold tabular-nums mt-0.5 ${toneClass}`}>{value}</div>
    </div>
  );
}