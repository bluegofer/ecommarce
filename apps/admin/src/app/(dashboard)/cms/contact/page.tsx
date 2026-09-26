'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, MailCheck, Trash2 } from 'lucide-react';
import { PageHeader, StatusChip, EmptyState, Modal, useToast } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';

type ContactStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'SPAM';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  orderNo: string | null;
  subject: string;
  message: string;
  status: ContactStatus;
  replyBody: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_FILTERS: Array<{ key: 'ALL' | ContactStatus; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'NEW', label: 'New' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'SPAM', label: 'Spam' },
];

const STATUS_TONE: Record<ContactStatus, 'info' | 'success' | 'neutral' | 'danger'> = {
  NEW: 'info',
  IN_PROGRESS: 'neutral',
  RESOLVED: 'success',
  SPAM: 'danger',
};

export default function CmsContactInboxPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<'ALL' | ContactStatus>('ALL');
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [replyBody, setReplyBody] = useState('');

  const { data, loading, error, refetch } = useQuery<ContactMessage[]>(
    '/api/v1/cms/contact',
  );

  const statusMutation = useMutation<
    { id: string; status: ContactStatus },
    unknown
  >('patch', (input) => `/api/v1/cms/contact/${(input as { id: string }).id}/status`);

  const replyMutation = useMutation<{ id: string; replyBody: string }, unknown>(
    'post',
    (input) => `/api/v1/cms/contact/${(input as { id: string }).id}/reply`,
  );

  const filtered =
    filter === 'ALL'
      ? data ?? []
      : (data ?? []).filter((m) => m.status === filter);

  async function changeStatus(m: ContactMessage, status: ContactStatus) {
    try {
      await statusMutation.mutate({ id: m.id, status });
      toast.success(`Marked as ${status}`);
      void refetch();
    } catch (e) {
      toast.error('Update failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  async function sendReply() {
    if (!selected) return;
    if (!replyBody.trim()) {
      toast.error('Empty reply', 'Write a reply before sending');
      return;
    }
    try {
      await replyMutation.mutate({ id: selected.id, replyBody: replyBody.trim() });
      toast.success('Reply saved (customer notified)');
      setSelected(null);
      setReplyBody('');
      void refetch();
    } catch (e) {
      toast.error('Reply failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  function openMessage(m: ContactMessage) {
    setSelected(m);
    setReplyBody(m.replyBody ?? '');
  }

  return (
    <div className="space-y-5">
      <div className="text-[12.5px] text-slate-500">
        <Link href="/cms" className="text-sky-700 hover:underline font-medium">
          ← CMS Home
        </Link>
      </div>

      <PageHeader
        title="CMS · Contact inbox"
        subtitle="Messages submitted from the storefront contact form"
      />

      <div className="flex items-center gap-1 border-b border-border">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={
              'h-10 px-3 text-sm font-medium border-b-2 -mb-px transition-colors ' +
              (filter === f.key
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-700')
            }
          >
            {f.label}
            {f.key !== 'ALL' && data && (
              <span className="ml-1.5 text-[11px] text-slate-400 tabular-nums">
                {data.filter((m) => m.status === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading messages…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No messages"
            description={
              filter === 'ALL'
                ? 'Storefront contact form submissions will appear here.'
                : `No ${filter.toLowerCase()} messages.`
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((m) => (
              <li
                key={m.id}
                className="p-4 hover:bg-slate-50 cursor-pointer"
                onClick={() => openMessage(m)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-800">{m.subject}</span>
                      <StatusChip label={m.status} tone={STATUS_TONE[m.status]} />
                    </div>
                    <div className="text-[12.5px] text-slate-500 mt-0.5">
                      {m.name} · {m.email}
                      {m.phone ? ` · ${m.phone}` : ''}
                      {m.orderNo ? ` · Order ${m.orderNo}` : ''}
                    </div>
                    <p className="text-[13px] text-slate-600 mt-1 line-clamp-2">
                      {m.message}
                    </p>
                  </div>
                  <div className="text-[11.5px] text-slate-400 whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detail + Reply modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.subject ?? ''}
        size="md"
        footer={
          <>
            <div className="flex-1 flex items-center gap-2">
              {selected && selected.status !== 'SPAM' && (
                <button
                  type="button"
                  onClick={() => void changeStatus(selected, 'SPAM')}
                  className="h-9 px-3 rounded border border-danger-200 bg-white text-danger-700 text-sm font-medium hover:bg-danger-50 inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Mark spam
                </button>
              )}
              {selected && selected.status !== 'RESOLVED' && (
                <button
                  type="button"
                  onClick={() => void changeStatus(selected, 'RESOLVED')}
                  className="h-9 px-3 rounded border border-border bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 inline-flex items-center gap-1.5"
                >
                  <MailCheck className="w-3.5 h-3.5" /> Mark resolved
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={sendReply}
              disabled={replyMutation.loading}
              className="h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
            >
              {replyMutation.loading ? 'Sending…' : 'Save reply'}
            </button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded border border-border bg-slate-50 p-3 text-[13px] text-slate-700 whitespace-pre-wrap">
              {selected.message}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[12px] text-slate-500">
              <div>
                <strong className="text-slate-700">From:</strong> {selected.name}
              </div>
              <div>
                <strong className="text-slate-700">Email:</strong> {selected.email}
              </div>
              {selected.phone && (
                <div>
                  <strong className="text-slate-700">Phone:</strong> {selected.phone}
                </div>
              )}
              {selected.orderNo && (
                <div>
                  <strong className="text-slate-700">Order:</strong> {selected.orderNo}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
                Reply
              </label>
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={4}
                className="w-full p-3 rounded border border-border bg-white text-sm text-slate-700 focus:border-sky-400 focus:outline-none"
                placeholder="Type your reply — will be sent to the customer's email…"
              />
              {selected.repliedAt && (
                <p className="text-[11.5px] text-slate-400 mt-1">
                  Last replied {new Date(selected.repliedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}