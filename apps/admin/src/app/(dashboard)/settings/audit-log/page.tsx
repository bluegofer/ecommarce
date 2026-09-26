'use client';

import { useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { PageHeader, DataTable, StatusChip } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery } from '@/lib/hooks';
import { formatDateTime } from '@/lib/utils';

interface AuditEntry {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export default function AuditLogPage() {
  const [q, setQ] = useState('');
  const { data, loading, error } = useQuery<AuditEntry[]>(
    `/api/v1/audit?${q ? `q=${encodeURIComponent(q)}` : ''}`,
  );

  const columns: Column<AuditEntry>[] = [
    { key: 'when', header: 'When', render: (r) => <span className="text-[12.5px] text-slate-500 whitespace-nowrap">{formatDateTime(r.createdAt)}</span> },
    { key: 'actor', header: 'Actor', render: (r) => <span className="text-slate-700">{r.actorName}</span> },
    { key: 'action', header: 'Action', render: (r) => <StatusChip label={r.action} tone="info" /> },
    { key: 'entity', header: 'Entity', render: (r) => (
      <span className="text-[12.5px] text-slate-600">
        <span className="font-medium">{r.entityType}</span>
        {r.entityId && <code className="ml-1.5 font-mono text-slate-400">{r.entityId.slice(0, 8)}</code>}
      </span>
    ) },
    { key: 'before', header: 'Before', render: (r) => <span className="font-mono text-[11.5px] text-slate-400 max-w-xs truncate inline-block">{JSON.stringify(r.before)?.slice(0, 60) ?? '—'}</span> },
    { key: 'after', header: 'After', render: (r) => <span className="font-mono text-[11.5px] text-slate-400 max-w-xs truncate inline-block">{JSON.stringify(r.after)?.slice(0, 60) ?? '—'}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Audit log" subtitle="Full record of who changed what, when, before/after values" />
      <div className="card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by actor, entity, or action…"
            className="w-full h-9 pl-9 pr-3 rounded border border-border bg-white text-sm focus:border-sky-400 focus:outline-none"
          />
        </div>
      </div>
      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <ScrollText className="w-8 h-8 mx-auto mb-3 text-slate-300" />
            No audit entries match.
          </div>
        ) : (
          <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
        )}
      </div>
    </div>
  );
}