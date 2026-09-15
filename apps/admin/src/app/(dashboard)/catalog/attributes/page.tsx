'use client';

import { useState } from 'react';
import { Plus, Search, Tag } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, EmptyState, useToast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery } from '@/lib/hooks';

interface Attribute {
  id: string;
  nameEn: string;
  nameBn: string;
  code: string;
  type: 'TEXT' | 'NUMBER' | 'SELECT' | 'MULTISELECT' | 'BOOLEAN';
  isVariantAxis: boolean;
  options?: string[];
  createdAt: string;
}

const TYPE_LABEL: Record<Attribute['type'], string> = {
  TEXT: 'Text',
  NUMBER: 'Number',
  SELECT: 'Select',
  MULTISELECT: 'Multi-select',
  BOOLEAN: 'Yes/No',
};

export default function AttributesPage() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const { data, loading, error } = useQuery<Attribute[]>(
    `/api/v1/attributes${q ? `?q=${encodeURIComponent(q)}` : ''}`,
  );

  const columns: Column<Attribute>[] = [
    {
      key: 'name',
      header: 'Attribute',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800">{row.nameEn}</div>
          <div className="text-[12px] text-slate-400">
            {row.nameBn} · <code className="font-mono">{row.code}</code>
          </div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (row) => TYPE_LABEL[row.type] },
    {
      key: 'options',
      header: 'Options',
      render: (row) =>
        row.options && row.options.length > 0 ? (
          <span className="text-slate-600 text-[12.5px]">
            {row.options.slice(0, 4).join(', ')}
            {row.options.length > 4 ? ` +${row.options.length - 4}` : ''}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'variant',
      header: 'Variant axis',
      render: (row) =>
        row.isVariantAxis ? (
          <StatusChip label="Yes" tone="success" />
        ) : (
          <StatusChip label="No" tone="neutral" />
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Attributes"
        subtitle="Define attributes and attach them to categories — new category = data entry, not code"
        actions={
          <button
            type="button"
            onClick={() => toast.push({ tone: 'info', title: 'Create attribute', description: 'Modal wired in B.3.' })}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            <Plus className="w-4 h-4" /> New attribute
          </button>
        }
      />

      <div className="card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search attributes…"
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
          <EmptyState
            icon={Tag}
            title="No attributes yet"
            description="Attributes define what makes a product — size, color, RAM, weight."
          />
        ) : (
          <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
        )}
      </div>
    </div>
  );
}