'use client';

import { useState } from 'react';
import { Plus, Trash2, Link2, ExternalLink } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, useToast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';

interface RedirectRow {
  id: string;
  fromSlug: string;
  toSlug: string;
  entityType: string;
  statusCode: number;
  createdAt: string;
}

export default function RedirectsPage() {
  const toast = useToast();
  const { data, loading, error, refetch } = useQuery<RedirectRow[]>(
    '/api/v1/catalog/slug-redirects',
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [fromSlug, setFromSlug] = useState('');
  const [toSlug, setToSlug] = useState('');
  const [busy, setBusy] = useState(false);

  const createMutation = useMutation<{ fromSlug: string; toSlug: string; entityType?: string }, unknown>(
    'post',
    '/api/v1/catalog/slug-redirects',
  );
  const deleteMutation = useMutation<string, unknown>(
    'delete',
    (id) => `/api/v1/catalog/slug-redirects/${id}`,
  );

  async function handleCreate() {
    const f = fromSlug.trim().replace(/^\/+/, '');
    const t = toSlug.trim().replace(/^\/+/, '');
    if (!f || !t) {
      toast.error('Both slugs required');
      return;
    }
    if (f === t) {
      toast.error('From and To must differ');
      return;
    }
    setBusy(true);
    try {
      await createMutation.mutate({ fromSlug: f, toSlug: t, entityType: 'manual' });
      toast.success('Redirect created');
      setFromSlug('');
      setToSlug('');
      setModalOpen(false);
      void refetch();
    } catch (e) {
      toast.error('Create failed', e instanceof Error ? e.message : 'Unknown');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(row: RedirectRow) {
    if (!confirm(`Delete redirect "${row.fromSlug}"?`)) return;
    try {
      await deleteMutation.mutate(row.id);
      toast.success('Redirect deleted');
      void refetch();
    } catch (e) {
      toast.error('Delete failed');
    }
  }

  const columns: Column<RedirectRow>[] = [
    {
      key: 'from',
      header: 'From URL',
      render: (r) => (
        <div className="flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5 text-slate-400" />
          <code className="font-mono text-[12px] text-slate-700">/{r.fromSlug}</code>
        </div>
      ),
    },
    {
      key: 'to',
      header: 'To URL',
      render: (r) => (
        <div className="flex items-center gap-2">
          <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
          <code className="font-mono text-[12px] text-slate-700">/{r.toSlug}</code>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (r) => (
        <StatusChip
          label={r.entityType}
          tone={r.entityType === 'category' ? 'info' : r.entityType === 'product' ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'code',
      header: 'Code',
      align: 'right',
      render: (r) => <span className="tabular-nums text-[12px] text-slate-500">{r.statusCode}</span>,
    },
    {
      key: 'created',
      header: 'Created',
      render: (r) => (
        <span className="text-[12px] text-slate-500">
          {new Date(r.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <button
          type="button"
          onClick={() => handleDelete(r)}
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-danger-600 hover:text-danger-700"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="URL redirects (301)"
        subtitle="Auto-recorded when slug changes · manual redirects for campaigns"
        actions={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            <Plus className="w-4 h-4" /> Add redirect
          </button>
        }
      />

      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading redirects…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Link2 className="w-8 h-8 mx-auto mb-3 text-slate-300" />
            No redirects yet. Category slug changes will appear here automatically.
          </div>
        ) : (
          <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-lg p-5 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-900">Add manual redirect</h3>
            <div>
              <label className="block text-[12.5px] font-medium text-slate-700 mb-1">
                From path
              </label>
              <input
                type="text"
                value={fromSlug}
                onChange={(e) => setFromSlug(e.target.value)}
                placeholder="e.g. eid-sale-2026"
                className="w-full h-10 px-3 rounded border border-border bg-white text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-medium text-slate-700 mb-1">
                To path
              </label>
              <input
                type="text"
                value={toSlug}
                onChange={(e) => setToSlug(e.target.value)}
                placeholder="e.g. c/electronics"
                className="w-full h-10 px-3 rounded border border-border bg-white text-sm font-mono"
              />
            </div>
            <p className="text-[11.5px] text-slate-500">
              A 301 redirect will be created from /{fromSlug || 'from'} → /{toSlug || 'to'}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-9 px-3 rounded border border-border bg-white text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleCreate}
                className="h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
              >
                {busy ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
