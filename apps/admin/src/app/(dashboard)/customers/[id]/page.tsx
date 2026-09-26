'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Phone, Mail, MessageSquare, MapPin, Plus } from 'lucide-react';
import { PageHeader, StatusChip, useToast, Modal } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';
import { formatPoisha, formatDateTime } from '@/lib/utils';

interface Timeline {
  kind: 'ORDER' | 'REVIEW' | 'RETURN' | 'TICKET' | 'NOTE' | 'CALL' | 'CHAT' | 'COMPLAINT' | 'FOLLOWUP';
  at: string;
  label: string;
  detail?: string;
}

interface Customer360 {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  isGuest: boolean;
  totalOrders: number;
  totalSpentPoisha: number;
  clvPoisha: number;
  aovPoisha: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  segmentLabels: string[];
  addresses: Array<{ id: string; label: string; fullAddress: string }>;
  timeline: Timeline[];
}

const TIMELINE_TONE: Record<Timeline['kind'], string> = {
  ORDER: 'bg-sky-100 text-sky-700',
  REVIEW: 'bg-warning-100 text-warning-700',
  RETURN: 'bg-danger-100 text-danger-700',
  TICKET: 'bg-info-100 text-info-600',
  NOTE: 'bg-slate-100 text-slate-600',
  CALL: 'bg-teal-100 text-teal-600',
  CHAT: 'bg-success-100 text-success-700',
  COMPLAINT: 'bg-danger-100 text-danger-700',
  FOLLOWUP: 'bg-info-100 text-info-600',
};

const TABS = ['Timeline', 'Addresses'] as const;

export default function Customer360Page() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Timeline');
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');

  const customerId = params?.id;
  const { data, loading, error, refetch } = useQuery<Customer360>(
    customerId ? `/api/v1/crm/customers/${customerId}/profile` : null,
  );

  const noteMutation = useMutation<{ body: string }, unknown>(
    'post',
    `/api/v1/crm/customers/${customerId}/notes`,
  );

  if (loading && !data) return <div className="p-10 text-center text-slate-400">Loading…</div>;
  if (error || !data) {
    return (
      <div className="p-10 text-center">
        <p className="font-medium text-danger-700">Customer not found</p>
        <p className="text-sm text-slate-500 mt-1">{error?.message}</p>
        <Link href="/customers" className="mt-4 inline-block text-sky-700 font-medium hover:underline">← Back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" /> Back to customers
      </Link>

      <PageHeader
        title={data.fullName}
        subtitle={`Joined ${data.firstOrderAt ? formatDateTime(data.firstOrderAt) : '—'} · ${data.isGuest ? 'Guest' : 'Registered'}`}
        actions={
          <>
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus className="w-4 h-4" /> Add note
            </button>
            <a
              href={`tel:${data.phone}`}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              <Phone className="w-4 h-4" /> Call
            </a>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Orders" value={String(data.totalOrders)} />
            <Stat label="Spent" value={formatPoisha(data.totalSpentPoisha)} />
            <Stat label="AOV" value={formatPoisha(data.aovPoisha)} />
            <Stat label="CLV" value={formatPoisha(data.clvPoisha)} highlight />
          </div>

          {/* Tabs */}
          <div className="border-b border-border">
            <nav className="flex gap-1">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
                    tab === t ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </nav>
          </div>

          {tab === 'Timeline' && (
            <div className="card p-5">
              {data.timeline.length === 0 ? (
                <p className="text-center text-slate-400 py-6">No activity yet.</p>
              ) : (
                <ol className="space-y-3">
                  {data.timeline.map((t, i) => (
                    <li key={i} className="flex gap-3">
                      <span className={`w-8 h-8 grid place-items-center rounded-full text-[10px] font-semibold ${TIMELINE_TONE[t.kind]}`}>
                        {t.kind.slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-medium text-slate-800">{t.label}</div>
                        {t.detail && <div className="text-[12.5px] text-slate-500">{t.detail}</div>}
                        <div className="text-[11.5px] text-slate-400 mt-0.5">
                          {formatDateTime(t.at)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {tab === 'Addresses' && (
            <div className="card p-5 space-y-3">
              {data.addresses.length === 0 ? (
                <p className="text-center text-slate-400 py-6">No saved addresses.</p>
              ) : (
                data.addresses.map((a) => (
                  <div key={a.id} className="p-3 rounded border border-border bg-slate-50">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-800">{a.label}</span>
                    </div>
                    <p className="text-[13px] text-slate-600">{a.fullAddress}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-slate-900">Contact</h3>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-slate-400" />
              <span className="font-mono text-slate-700">{data.phone}</span>
            </div>
            {data.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700 truncate">{data.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 text-[12.5px]">Chat history archived</span>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Segments</h3>
            <div className="flex flex-wrap gap-1">
              {data.segmentLabels.length === 0 ? (
                <p className="text-[12.5px] text-slate-400">No segments assigned.</p>
              ) : (
                data.segmentLabels.map((s) => (
                  <StatusChip key={s} label={s} tone="info" />
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      <Modal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Add note"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setNoteOpen(false)}
              className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                await noteMutation.mutate({ body: noteText });
                toast.success('Note added');
                setNoteOpen(false);
                setNoteText('');
                void refetch();
              }}
              className="h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              Save
            </button>
          </>
        }
      >
        <textarea
          rows={4}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Internal note (customer service, follow-up, complaint context)…"
          className="w-full p-3 rounded border border-border bg-white text-sm focus:border-sky-400 focus:outline-none"
        />
      </Modal>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="card p-4">
      <p className="text-[12px] font-medium text-slate-500">{label}</p>
      <p className={`mt-1.5 text-lg font-semibold tabular-nums ${highlight ? 'text-sky-700' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}