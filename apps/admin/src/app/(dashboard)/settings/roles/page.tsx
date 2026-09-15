'use client';

import { PageHeader, StatusChip } from '@/components/ui';
import { useQuery } from '@/lib/hooks';

interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}

export default function RolesPage() {
  const { data, loading, error } = useQuery<Role[]>('/api/v1/auth/roles');

  return (
    <div className="space-y-5">
      <PageHeader title="Roles & permissions" subtitle="Server-side RBAC is source of truth — the UI only hides what a role cannot do" />
      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading roles…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-border">
              <tr>
                <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 uppercase">Code</th>
                <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 uppercase">Description</th>
                <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 uppercase">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(!data || data.length === 0) ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">No roles found.</td></tr>
              ) : data.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3"><code className="font-mono text-slate-800">{r.code}</code></td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                  <td className="px-4 py-3 text-slate-600 text-[12.5px]">{r.description ?? '—'}</td>
                  <td className="px-4 py-3">
                    {r.isSystem ? <StatusChip label="System" tone="info" /> : <StatusChip label="Custom" tone="neutral" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}