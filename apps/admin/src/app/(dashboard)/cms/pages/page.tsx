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

export default function CmsPagesPage() {
  const toast = useToast();
  const [revisionsFor, setRevisionsFor] = useState<CmsPage | null>(null);

  const { data, loading, error, refetch } = useQuery<CmsPage[]>('/api/v1/cms/pages');
  const revisionsQuery = useQuery<Revision[]>(
    revisionsFor ? `/api/v1/cms/pages/${revisionsFor.id}/revisions` : null,
  );
  const restoreMutation = useMutation<{ id: string; revisionNumber: number }, unknown>(
    'post',
    (input) => `/api/v1/cms/pages/${(input as { id: string }).id}/revisions/${(input as { revisionNumber: number }).revisionNumber}/restore`,
  );

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
            onClick={() => toast.push({ tone: 'info', title: 'New page', description: 'Modal in follow-up.' })}
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
    </div>
  );
}