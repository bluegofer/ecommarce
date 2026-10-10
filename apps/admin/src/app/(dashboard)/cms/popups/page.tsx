'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Plus, Trash2, Pencil } from 'lucide-react';
import { PageHeader, StatusChip, EmptyState, Modal, useToast } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';

interface Popup {
  id: string;
  titleEn: string;
  titleBn: string;
  bodyEn: string | null;
  bodyBn: string | null;
  imageUrl: string | null;
  ctaLabelEn: string | null;
  ctaLabelBn: string | null;
  ctaUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  id: string | null;
  titleEn: string;
  titleBn: string;
  bodyEn: string;
  bodyBn: string;
  imageUrl: string;
  ctaLabelEn: string;
  ctaLabelBn: string;
  ctaUrl: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  id: null,
  titleEn: '',
  titleBn: '',
  bodyEn: '',
  bodyBn: '',
  imageUrl: '',
  ctaLabelEn: '',
  ctaLabelBn: '',
  ctaUrl: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
};

export default function CmsPopupsPage() {
  const toast = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const { data, loading, error, refetch } = useQuery<Popup[]>('/api/v1/cms/popups');

  const saveMutation = useMutation<unknown, unknown>(
    form?.id ? 'patch' : 'post',
    form?.id ? `/api/v1/cms/popups/${form.id}` : '/api/v1/cms/popups',
  );

  const deleteMutation = useMutation<string, unknown>(
    'delete',
    (input) => `/api/v1/cms/popups/${(input as unknown as string)}`,
  );

  async function handleSave() {
    if (!form) return;
    if (!form.titleEn.trim() || !form.titleBn.trim()) {
      toast.error('Missing fields', 'English and Bangla titles are required');
      return;
    }
    const payload: Record<string, unknown> = {
      titleEn: form.titleEn.trim(),
      titleBn: form.titleBn.trim(),
      isActive: form.isActive,
    };
    if (form.bodyEn.trim()) payload.bodyEn = form.bodyEn.trim();
    if (form.bodyBn.trim()) payload.bodyBn = form.bodyBn.trim();
    if (form.imageUrl.trim()) payload.imageUrl = form.imageUrl.trim();
    if (form.ctaLabelEn.trim()) payload.ctaLabelEn = form.ctaLabelEn.trim();
    if (form.ctaLabelBn.trim()) payload.ctaLabelBn = form.ctaLabelBn.trim();
    if (form.ctaUrl.trim()) payload.ctaUrl = form.ctaUrl.trim();
    if (form.startsAt) payload.startsAt = new Date(form.startsAt).toISOString();
    if (form.endsAt) payload.endsAt = new Date(form.endsAt).toISOString();
    try {
      await saveMutation.mutate(payload);
      toast.success(form.id ? 'Popup updated' : 'Popup created');
      setForm(null);
      void refetch();
    } catch (e) {
      toast.error('Save failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  async function handleDelete(p: Popup) {
    if (!confirm(`Delete popup "${p.titleEn}"?`)) return;
    try {
      await deleteMutation.mutate(p.id);
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
        title="CMS · Popups"
        subtitle="Marketing popups (newsletter signup, offers) with schedule + CTA"
        actions={
          <button
            type="button"
            onClick={() => setForm({ ...EMPTY_FORM })}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            <Plus className="w-4 h-4" /> New popup
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
            icon={MessageSquare}
            title="No popups yet"
            description="Create a popup to promote offers, newsletter signup, or announcements."
          />
        ) : (
          <ul className="divide-y divide-border">
            {data.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 p-4 hover:bg-slate-50"
              >
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.titleEn}
                    className="w-12 h-12 rounded object-cover bg-slate-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-slate-100 grid place-items-center">
                    <MessageSquare className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 truncate">
                    {p.titleEn}
                  </div>
                  <div className="text-[12.5px] text-slate-500 truncate">
                    {p.bodyEn ?? p.titleBn}
                  </div>
                  {p.ctaUrl && (
                    <code className="text-[11.5px] text-slate-400 font-mono">
                      {p.ctaUrl}
                    </code>
                  )}
                </div>
                {!p.isActive && <StatusChip label="Inactive" tone="neutral" />}
                {p.startsAt && <StatusChip label="Scheduled" tone="info" />}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        id: p.id,
                        titleEn: p.titleEn,
                        titleBn: p.titleBn,
                        bodyEn: p.bodyEn ?? '',
                        bodyBn: p.bodyBn ?? '',
                        imageUrl: p.imageUrl ?? '',
                        ctaLabelEn: p.ctaLabelEn ?? '',
                        ctaLabelBn: p.ctaLabelBn ?? '',
                        ctaUrl: p.ctaUrl ?? '',
                        startsAt: p.startsAt ? toLocalInput(p.startsAt) : '',
                        endsAt: p.endsAt ? toLocalInput(p.endsAt) : '',
                        isActive: p.isActive,
                      })
                    }
                    className="h-8 w-8 grid place-items-center rounded hover:bg-slate-100"
                    aria-label="Edit"
                  >
                    <Pencil className="w-4 h-4 text-slate-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(p)}
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
        title={form?.id ? 'Edit popup' : 'New popup'}
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
              <span className="text-[12.5px] font-medium text-slate-700">English title</span>
              <input
                type="text"
                value={form.titleEn}
                onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded border border-border text-sm"
                placeholder="e.g. Get 10% off your first order"
              />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-medium text-slate-700">Bangla title</span>
              <input
                type="text"
                value={form.titleBn}
                onChange={(e) => setForm({ ...form, titleBn: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded border border-border text-sm"
                placeholder="e.g. প্রথম অর্ডারে ১০% ছাড়"
              />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-medium text-slate-700">Body (English)</span>
              <textarea
                value={form.bodyEn}
                onChange={(e) => setForm({ ...form, bodyEn: e.target.value })}
                rows={2}
                className="mt-1 w-full px-3 py-2 rounded border border-border text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-medium text-slate-700">Body (Bangla)</span>
              <textarea
                value={form.bodyBn}
                onChange={(e) => setForm({ ...form, bodyBn: e.target.value })}
                rows={2}
                className="mt-1 w-full px-3 py-2 rounded border border-border text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-medium text-slate-700">Image URL</span>
              <input
                type="text"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded border border-border text-sm font-mono"
                placeholder="https://... (optional)"
              />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="text-[12.5px] font-medium text-slate-700">CTA (EN)</span>
                <input
                  type="text"
                  value={form.ctaLabelEn}
                  onChange={(e) => setForm({ ...form, ctaLabelEn: e.target.value })}
                  className="mt-1 w-full h-9 px-3 rounded border border-border text-sm"
                  placeholder="Shop now"
                />
              </label>
              <label className="block">
                <span className="text-[12.5px] font-medium text-slate-700">CTA (BN)</span>
                <input
                  type="text"
                  value={form.ctaLabelBn}
                  onChange={(e) => setForm({ ...form, ctaLabelBn: e.target.value })}
                  className="mt-1 w-full h-9 px-3 rounded border border-border text-sm"
                  placeholder="এখনই কিনুন"
                />
              </label>
              <label className="block">
                <span className="text-[12.5px] font-medium text-slate-700">CTA URL</span>
                <input
                  type="text"
                  value={form.ctaUrl}
                  onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                  className="mt-1 w-full h-9 px-3 rounded border border-border text-sm font-mono"
                  placeholder="/deals"
                />
              </label>
            </div>
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