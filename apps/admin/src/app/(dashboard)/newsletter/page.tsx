'use client';

import { useMemo, useState } from 'react';
import { Download, Trash2, Mail, Users, UserPlus, UserMinus, type LucideIcon } from 'lucide-react';
import { PageHeader, EmptyState, useToast } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  source: string | null;
  locale: string | null;
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt: string | null;
}

type Filter = 'all' | 'active' | 'inactive';

export default function NewsletterPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const { data, loading, error, refetch } = useQuery<Subscriber[]>(
    '/api/v1/newsletter/subscribers',
  );

  const deleteMutation = useMutation<{ id: string }, unknown>(
    'delete',
    (input) => `/api/v1/newsletter/subscribers/${(input as { id: string }).id}`,
  );

  const stats = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      active: list.filter((s) => s.isActive).length,
      inactive: list.filter((s) => !s.isActive).length,
      last7d: list.filter((s) => {
        const d = new Date(s.subscribedAt).getTime();
        return Date.now() - d < 7 * 24 * 60 * 60 * 1000;
      }).length,
    };
  }, [data]);

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (filter === 'active') list = list.filter((s) => s.isActive);
    if (filter === 'inactive') list = list.filter((s) => !s.isActive);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.email.toLowerCase().includes(q) ||
          (s.name ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, filter, search]);

  function exportCsv() {
    const list = filtered;
    const headers = ['email', 'name', 'source', 'locale', 'isActive', 'subscribedAt'];
    const rows = list.map((s) =>
      [s.email, s.name ?? '', s.source ?? '', s.locale ?? '', String(s.isActive), s.subscribedAt]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${list.length} subscribers`);
  }

  async function handleDelete(s: Subscriber) {
    if (!confirm(`Delete subscriber "${s.email}"?`)) return;
    try {
      await deleteMutation.mutate({ id: s.id });
      toast.success('Subscriber deleted');
      void refetch();
    } catch (e) {
      toast.error('Delete failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Newsletter"
        subtitle="Subscribers captured from the storefront footer and contact forms."
        actions={
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} icon={Users} tone="slate" />
        <StatCard label="Active" value={stats.active} icon={UserPlus} tone="green" />
        <StatCard label="Unsubscribed" value={stats.inactive} icon={UserMinus} tone="amber" />
        <StatCard label="Last 7 days" value={stats.last7d} icon={Mail} tone="sky" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded border border-border overflow-hidden">
          {(['all', 'active', 'inactive'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={
                'px-3 h-9 text-sm font-medium ' +
                (filter === f
                  ? 'bg-sky-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50')
              }
            >
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Unsubscribed'}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input h-9 max-w-xs"
        />
        <span className="ml-auto text-[12px] text-slate-500">
          {filtered.length} of {stats.total}
        </span>
      </div>

      {loading && !data ? (
        <div className="card p-10 text-center text-slate-400">Loading subscribers…</div>
      ) : error ? (
        <div className="card p-10 text-center text-danger-700">{error.message}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No subscribers yet"
          description="Storefront footer form will populate this list."
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Email</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Name</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Source</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Locale</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Subscribed</th>
                <th className="text-right px-4 py-2.5 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 text-slate-800 font-medium">{s.email}</td>
                  <td className="px-4 py-2.5 text-slate-600">{s.name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs uppercase">{s.source ?? '—'}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs uppercase">{s.locale ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        'inline-flex items-center px-2 h-6 rounded-full text-[11px] font-semibold ' +
                        (s.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600')
                      }
                    >
                      {s.isActive ? 'Active' : 'Unsubscribed'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {new Date(s.subscribedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(s)}
                      className="inline-flex items-center gap-1 px-2 h-7 rounded text-xs text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${s.email}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: 'slate' | 'green' | 'amber' | 'sky';
}) {
  const toneClasses: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    sky: 'bg-sky-100 text-sky-700',
  };
  return (
    <div className="card p-4 flex items-center gap-3">
      <span className={`w-10 h-10 rounded-lg grid place-items-center ${toneClasses[tone]}`}>
        <Icon className="w-5 h-5" />
      </span>
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
        <div className="text-xl font-bold text-slate-800">{value}</div>
      </div>
    </div>
  );
}