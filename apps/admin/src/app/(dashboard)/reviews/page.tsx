'use client';

import { useState } from 'react';
import { Star, Check, X, MessageSquare } from 'lucide-react';
import { PageHeader, StatusChip, useToast, Modal } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  status: 'PENDING' | 'PUBLISHED' | 'HIDDEN';
  customerName: string;
  productTitle: string;
  createdAt: string;
}

const TABS = ['PENDING', 'PUBLISHED', 'HIDDEN'] as const;

export default function ReviewsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>('PENDING');
  const [replyTo, setReplyTo] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data, loading, error, refetch } = useQuery<Review[]>(
    `/api/v1/reviews/moderation/queue?status=${tab}`,
  );

  const moderateMutation = useMutation<
    { id: string; action: 'publish' | 'hide' },
    unknown
  >('patch', (input) => `/api/v1/reviews/moderation/${(input as { id: string }).id}`);

  const replyMutation = useMutation<
    { id: string; reply: string },
    unknown
  >('post', (input) => `/api/v1/reviews/moderation/${(input as { id: string }).id}/reply`);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reviews"
        subtitle="Moderation queue · publish or hide with a reason · public admin replies"
      />

      <div className="border-b border-border">
        <nav className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'border-sky-600 text-sky-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-3">
        {loading && !data ? (
          <div className="card p-10 text-center text-slate-400">Loading reviews…</div>
        ) : error ? (
          <div className="card p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <div className="card p-10 text-center text-slate-400">
            No reviews in “{tab}”.
          </div>
        ) : (
          data.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Stars rating={r.rating} />
                    {r.title && (
                      <span className="font-semibold text-slate-800">{r.title}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 mt-1">{r.body}</p>
                  <p className="text-[12px] text-slate-400 mt-2">
                    {r.customerName} · {r.productTitle} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {tab === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          await moderateMutation.mutate({ id: r.id, action: 'publish' });
                          toast.success('Review published');
                          void refetch();
                        }}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded bg-success-600 text-white text-[12.5px] font-medium hover:bg-success-700"
                      >
                        <Check className="w-3.5 h-3.5" /> Publish
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await moderateMutation.mutate({ id: r.id, action: 'hide' });
                          toast.success('Review hidden');
                          void refetch();
                        }}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded border border-border bg-white text-[12.5px] font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <X className="w-3.5 h-3.5" /> Hide
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTo(r);
                      setReplyText('');
                    }}
                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded border border-border bg-white text-[12.5px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Reply
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={!!replyTo}
        onClose={() => setReplyTo(null)}
        title="Admin reply"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!replyTo) return;
                await replyMutation.mutate({ id: replyTo.id, reply: replyText });
                toast.success('Reply posted');
                setReplyTo(null);
                void refetch();
              }}
              className="h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              Post reply
            </button>
          </>
        }
      >
        <textarea
          rows={4}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Public reply visible on the PDP…"
          className="w-full p-3 rounded border border-border bg-white text-sm focus:border-sky-400 focus:outline-none"
        />
      </Modal>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-4 h-4 ${n <= rating ? 'text-warning-500 fill-warning-500' : 'text-slate-200'}`}
        />
      ))}
    </span>
  );
}