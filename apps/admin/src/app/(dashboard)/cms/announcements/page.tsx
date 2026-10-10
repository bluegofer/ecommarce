'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Megaphone, Plus, Trash2, Pencil } from 'lucide-react';
import { PageHeader, StatusChip, EmptyState, Modal, useToast } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';

interface Announcement {
  id: string;
  textEn: string;
  textBn: string;
  bgColor: string;
  textColor: string;
  linkUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  id: string | null;
  textEn: string;
  textBn: string;
  bgColor: string;
  textColor: string;
  linkUrl: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  id: null,
  textEn: '',
  textBn: '',
  bgColor: '#164561',
  textColor: '#FFFFFF',
  linkUrl: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
};

export default function CmsAnnouncementsPage() {
  const toast = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const { data, loading, error, refetch } = useQuery<Announcement[]>(
    '/api/v1/cms/announcements',
  );

  const saveMutation = useMutation<unknown, unknown>(
    form?.id ? 'patch' : 'post',
    form?.id ? `/api/v1/cms/announcements/${form.id}` : '/api/v1/cms/announcements',
  );

  const deleteMutation = useMutation<string, unknown>(
    'delete',
    (input) => `/api/v1/cms/announcements/${(input as unknown as string)}`,
  );

  async function handleSave() {
    if (!form) return;
    if (!form.textEn.trim() || !form.textBn.trim()) {
      toast.error('Missing fields', 'English and Bangla text are required');
      return;
    }
    const payload: Record<string, unknown> = {
      textEn: form.textEn.trim(),
      textBn: form.textBn.trim(),
      bgColor: form.bgColor || '#164561',
      textColor: form.textColor || '#FFFFFF',
      isActive: form.isActive,
    };
    if (form.linkUrl.trim()) payload.linkUrl = form.linkUrl.trim();
    if (form.startsAt) payload.startsAt = new Date(form.startsAt).toISOString();
    if (form.endsAt) payload.endsAt = new Date(form.endsAt).toISOString();
    try {
      await saveMutation.mutate(payload);
      toast.success(form.id ? 'Announcement updated' : 'Announcement created');
      setForm(null);
      void refetch();
    } catch (e) {
      toast.error('Save failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  async function handleDelete(a: Announcement) {
    if (!confirm(`Delete announcement "${a.textEn}"?`)) return;
    try {
      await deleteMutation.mutate(a.id);
      toast.success('Deleted');
      void refetch();
    } catch (e) {
      toast.error('Delete failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-[12.5px] text-slate-500">
        <Link href="/cms" className="text-sky-700 hover:underline font-medium">
          ← CMS Home
        </Link>
      </div>

      <PageHeader
        title="CMS · Announcements"
        subtitle="Top-of-storefront announcement bar (bilingual, scheduled)"
        actions={
          <button
            type="button"
            onClick={() => setForm({ ...EMPTY_FORM })}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            <Plus className="w-4 h-4" /> New announcement
          </button>
        }
      />

      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No announcements yet"
            description="Create a banner to display at the top of the storefront."
          />
        ) : (
          <ul className="divide-y divide-border">
            {data.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 p-4 hover:bg-slate-50"
              >
                <div
                  className="w-3 h-12 rounded"
                  style={{ backgroundColor: a.bgColor }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 truncate">
                    {a.textEn}
                  </div>
                  <div className="text-[12.5px] text-slate-500 truncate">
                    {a.textBn}
                  </div>
                  {a.linkUrl && (
                    <code className="text-[11.5px] text-slate-400 font-mono">
                      {a.linkUrl}
                    </code>
                  )}
                </div>
                {!a.isActive && <StatusChip label="Inactive" tone="neutral" />}
                {a.startsAt && <StatusChip label="Scheduled" tone="info" />}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        id: a.id,
                        textEn: a.textEn,
                        textBn: a.textBn,
                        bgColor: a.bgColor,
                        textColor: a.textColor,
                        linkUrl: a.linkUrl ?? '',
                        startsAt: a.startsAt ? toLocalInput(a.startsAt) : '',
                        endsAt: a.endsAt ? toLocalInput(a.endsAt) : '',
                        isActive: a.isActive,
                      })
                    }
                    className="h-8 w-8 grid place-items-center rounded hover:bg-slate-100"
                    aria-label="Edit"
                  >
                    <Pencil className="w-4 h-4 text-slate-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(a)}
                    className="h-8 w-8 grid place-items-center rounded hover:bg-slate-100"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-danger-600" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'Edit announcement' : 'New announcement'}
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.loading}
              className="h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
            >
              {saveMutation.loading ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        {form && (
          <div className="space-y-3">
            <label className="block">
              <span className="text-[12.5px] font-medium text-slate-700">English text</span>
              <input
                type="text"
                value={form.textEn}
                onChange={(e) => setForm({ ...form, textEn: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded border border-border text-sm"
                placeholder="e.g. Free delivery over ৳1,500"
              />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-medium text-slate-700">Bangla text</span>
              <input
                type="text"
                value={form.textBn}
                onChange={(e) => setForm({ ...form, textBn: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded border border-border text-sm"
                placeholder="যেমন — ১,৫০০ টাকার উপরে ফ্রি ডেলিভারি"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[12.5px] font-medium text-slate-700">BG color</span>
                <input
                  type="color"
                  value={form.bgColor}
                  onChange={(e) => setForm({ ...form, bgColor: e.target.value })}
                  className="mt-1 w-full h-9 rounded border border-border"
                />
              </label>
              <label className="block">
                <span className="text-[12.5px] font-medium text-slate-700">Text color</span>
                <input
                  type="color"
                  value={form.textColor}
                  onChange={(e) => setForm({ ...form, textColor: e.target.value })}
                  className="mt-1 w-full h-9 rounded border border-border"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-[12.5px] font-medium text-slate-700">Link (optional)</span>
              <input
                type="text"
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded border border-border text-sm font-mono"
                placeholder="/deals or https://..."
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[12.5px] font-medium text-slate-700">Starts at</span>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  className="mt-1 w-full h-9 px-3 rounded border border-border text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[12.5px] font-medium text-slate-700">Ends at</span>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  className="mt-1 w-full h-9 px-3 rounded border border-border text-sm"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <span className="text-sm text-slate-700">Active</span>
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}