'use client';

import Link from 'next/link';
import { Factory, Plus } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, EmptyState, useToast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery } from '@/lib/hooks';
import { formatPoisha } from '@/lib/utils';

interface Supplier {
  id: string;
  code: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  currentDue: number;
  isActive: boolean;
}

export default function SuppliersPage() {
  const toast = useToast();
  const { data, loading, error } = useQuery<Supplier[]>('/api/v1/suppliers');

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier',
      render: (r) => (
        <div>
          <Link href={`/suppliers/${r.id}`} className="font-medium text-slate-800 hover:text-sky-700">
            {r.name}
          </Link>
          <code className="text-[11.5px] text-slate-400 font-mono">{r.code}</code>
        </div>
      ),
    },
    { key: 'contact', header: 'Contact', render: (r) => <span className="text-slate-700">{r.contactName ?? '—'}</span> },
    { key: 'phone', header: 'Phone', render: (r) => <span className="font-mono text-[12.5px] text-slate-600">{r.phone ?? '—'}</span> },
    {
      key: 'due',
      header: 'Payable',
      align: 'right',
      render: (r) => (
        <span className={`tabular-nums font-medium ${r.currentDue > 0 ? 'text-danger-700' : 'text-slate-600'}`}>
          {formatPoisha(r.currentDue)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusChip label={r.isActive ? 'Active' : 'Inactive'} tone={r.isActive ? 'success' : 'neutral'} />,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Suppliers"
        subtitle="Vendor profiles · payables · performance overview"
        actions={
          <button
            type="button"
            onClick={() => toast.push({ tone: 'info', title: 'New supplier', description: 'Modal in follow-up.' })}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            <Plus className="w-4 h-4" /> New supplier
          </button>
        }
      />
      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading suppliers…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={Factory} title="No suppliers yet" description="Add your first vendor to start purchasing." />
        ) : (
          <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
        )}
      </div>
    </div>
  );
}