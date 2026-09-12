'use client';

import { PageHeader, DataTable, StatusChip } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery } from '@/lib/hooks';
import { formatDateTime } from '@/lib/utils';

interface StaffUser {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  status: 'ACTIVE' | 'SUSPENDED';
  roles: string[];
  lastLoginAt: string | null;
}

export default function StaffUsersPage() {
  const { data, loading, error } = useQuery<StaffUser[]>('/api/v1/users');

  const columns: Column<StaffUser>[] = [
    { key: 'name', header: 'User', render: (r) => (
      <div>
        <div className="font-medium text-slate-800">{r.fullName}</div>
        <div className="text-[11.5px] text-slate-400 font-mono">{r.phone}</div>
      </div>
    ) },
    { key: 'email', header: 'Email', render: (r) => <span className="text-slate-600 text-[12.5px]">{r.email ?? '—'}</span> },
    { key: 'roles', header: 'Roles', render: (r) => (
      <div className="flex flex-wrap gap-1">
        {r.roles.map((role) => <StatusChip key={role} label={role} tone="info" />)}
      </div>
    ) },
    { key: 'status', header: 'Status', render: (r) => <StatusChip label={r.status} tone={r.status === 'ACTIVE' ? 'success' : 'danger'} /> },
    { key: 'login', header: 'Last login', render: (r) => r.lastLoginAt ? <span className="text-[12.5px] text-slate-500">{formatDateTime(r.lastLoginAt)}</span> : <span className="text-slate-400">Never</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Staff users" subtitle="Invite · 2FA reset · deactivate — linked to HR employee records" />
      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No staff users.</div>
        ) : (
          <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
        )}
      </div>
    </div>
  );
}