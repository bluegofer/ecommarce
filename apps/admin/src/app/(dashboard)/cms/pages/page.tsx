'use client';

import { useState } from 'react';
import { FileText, Plus, History, Save } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, EmptyState, Modal, useToast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';
import { formatDateTime } from '@/lib/utils';

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  updatedAt: string;
  revisionCount: number;
}

interface Revision {
  id: string;
  revisionNumber: number;
  createdAt: string;
  createdBy: string;
}

interface NewPageFormState {
  slug: string;
  titleEn: string;
  titleBn: string;
  bodyEn: string;
  bodyBn: string;
  status: 'DRAFT' | 'PUBLISHED';
}

interface NewPagePayload {
  slug: string;
  titleEn: string;
  titleBn: string;
  bodyEn?: string;
  bodyBn?: string;
  status: 'DRAFT' | 'PUBLISHED';
}

const EMPTY_FORM: NewPageFormState = {
  slug: '',
  titleEn: '',
  titleBn: '',
  bodyEn: '',
  bodyBn: '',
  status: 'DRAFT',
};

export default function CmsPagesPage() {
  const toast = useToast();
  const [revisionsFor, setRevisionsFor] = useState<CmsPage | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<NewPageFormState>({ ...EMPTY_FORM });

  const { data, loading, error, refetch } = useQuery<CmsPage[]>('/api/v1/cms/pages');
  const revisionsQuery = useQuery<Revision[]>(
    revisionsFor ? `/api/v1/cms/pages/${revisionsFor.id}/revisions` : null,
  );
  const restoreMutation = useMutation<{ id: string; revisionNumber: number }, unknown>(
    'post',
    (input) => `/api/v1/cms/pages/${(input as { id: string }).id}/revisions/${(input as { revisionNumber: number }).revisionNumber}/restore`,
  );
  const createMutation = useMutation<NewPagePayload, unknown>('post', '/api/v1/cms/pages');

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setCreateOpen(true);
  }

  async function handleCreate() {
    if (!form.slug.trim() || !form.titleEn.trim() || !form.titleBn.trim()) {
      toast.error('Missing fields', 'Slug, English title, and Bangla title are required');
      return;
    }
    const slugClean = form.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '');
    if (!slugClean) {
      toast.error('Invalid slug', 'Use lowercase letters, numbers, and dashes only');
      return;
    }

    // exactOptionalPropertyTypes: only set optional keys when they have a value.
    const payload: NewPagePayload = {
      slug: slugClean,
      titleEn: form.titleEn.trim(),
      titleBn: form.titleBn.trim(),
      status: form.status,
    };
    const bodyEn = form.bodyEn.trim();
    const bodyBn = form.bodyBn.trim();
    if (bodyEn) payload.bodyEn = bodyEn;
    if (bodyBn) payload.bodyBn = bodyBn;

    try {
      await createMutation.mutate(payload);
      toast.success('Page created');
      setCreateOpen(false);
      setForm({ ...EMPTY_FORM });
      void refetch();
    } catch (e) {
      toast.error('Create failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  const columns: Column<CmsPage>[] = [
    {
      key: 'title',
      header: 'Page',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-800">{r.title}</div>
          <code className="text-[12px] text-slate-400 font-mono">/{r.slug}</code>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <StatusChip label={r.status} tone={r.status === 'PUBLISHED' ? 'success' : 'neutral'} />
      ),
    },
    {
      key: 'revisions',
      header: 'Revisions',
      align: 'center',
      render: (r) => <span className="tabular-nums text-slate-600">{r.revisionCount}</span>,
    },
    {
      key: 'updated',
      header: 'Updated',
      render: (r) => (
        <span className="text-[12.5px] text-slate-500">{formatDateTime(r.updatedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <button
          type="button"
          onClick={() => setRevisionsFor(r)}
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-sky-700 hover:text-sky-800"
        >
          <History className="w-3.5 h-3.5" /> Revisions
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="CMS · Pages"
        subtitle="Rich text pages (About, Contact, FAQ, Policies) with revision history"
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            <Plus className="w-4 h-4" /> New page
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
            icon={FileText}
            title="No CMS pages yet"
            description="Create About, Contact, FAQ, and policy pages — required for payment gateway onboarding."
          />
        ) : (
          <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
        )}
      </div>

      {/* Revisions modal */}
      <Modal
        open={!!revisionsFor}
        onClose={() => setRevisionsFor(null)}
        title={`Revisions — ${revisionsFor?.title ?? ''}`}
        size="md"
      >
        {revisionsQuery.loading ? (
          <p className="text-center text-slate-400 py-6">Loading…</p>
        ) : !revisionsQuery.data || revisionsQuery.data.length === 0 ? (
          <p className="text-center text-slate-400 py-6">No revisions yet.</p>
        ) : (
          <ul className="space-y-2">
            {revisionsQuery.data.map((rev) => (
              <li
                key={rev.id}
                className="flex items-center justify-between p-3 rounded border border-border bg-slate-50"
              >
                <div>
                  <div className="text-[13px] font-medium text-slate-800">
                    Revision #{rev.revisionNumber}
                  </div>
                  <div className="text-[12px] text-slate-500">
                    {formatDateTime(rev.createdAt)} · {rev.createdBy}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await restoreMutation.mutate({
                      id: revisionsFor!.id,
                      revisionNumber: rev.revisionNumber,
                    });
                    toast.success('Revision restored');
                    setRevisionsFor(null);
                    void refetch();
                  }}
                  className="inline-flex items-center gap-1 h-8 px-2.5 rounded bg-sky-600 text-white text-[12.5px] font-medium hover:bg-sky-700"
                >
                  <Save className="w-3.5 h-3.5" /> Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {/* New page modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New page"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={createMutation.loading || !form.slug.trim() || !form.titleEn.trim()}
              className="h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
            >
              {createMutation.loading ? 'Creating…' : 'Create'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="text-[12.5px] font-medium text-slate-700">Slug (URL)</span>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded border border-border text-sm font-mono"
              placeholder="e.g. shipping-policy"
            />
            <span className="text-[11.5px] text-slate-400 mt-1 block">
              Storefront URL: /{'{locale}'}/pages/{form.slug || 'slug'}
            </span>
          </label>
          <label className="block">
            <span className="text-[12.5px] font-medium text-slate-700">English title</span>
            <input
              type="text"
              value={form.titleEn}
              onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded border border-border text-sm"
              placeholder="e.g. Shipping Policy"
            />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-medium text-slate-700">Bangla title</span>
            <input
              type="text"
              value={form.titleBn}
              onChange={(e) => setForm({ ...form, titleBn: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded border border-border text-sm"
              placeholder="e.g. শিপিং নীতি"
            />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-medium text-slate-700">Body (English)</span>
            <textarea
              value={form.bodyEn}
              onChange={(e) => setForm({ ...form, bodyEn: e.target.value })}
              rows={3}
              className="mt-1 w-full px-3 py-2 rounded border border-border text-sm font-mono"
              placeholder="<p>HTML content…</p>"
            />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-medium text-slate-700">Body (Bangla)</span>
            <textarea
              value={form.bodyBn}
              onChange={(e) => setForm({ ...form, bodyBn: e.target.value })}
              rows={3}
              className="mt-1 w-full px-3 py-2 rounded border border-border text-sm font-mono"
              placeholder="<p>HTML content…</p>"
            />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-medium text-slate-700">Status</span>
            <select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as 'DRAFT' | 'PUBLISHED' })
              }
              className="mt-1 w-full h-9 px-3 rounded border border-border text-sm"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </label>
        </div>
      </Modal>
    </div>
  );
}