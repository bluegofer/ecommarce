'use client';

import { UserCog, Plus } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, EmptyState, useToast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery } from '@/lib/hooks';
import { formatPoisha, formatDate } from '@/lib/utils';

interface Employee {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  department: { name: string } | null;
  designation: { name: string } | null;
  joiningDate: string;
  baseSalary: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export default function EmployeesPage() {
  const toast = useToast();
  const { data, loading, error } = useQuery<Employee[]>('/api/v1/hr/employees');

  const columns: Column<Employee>[] = [
    {
      key: 'name',
      header: 'Employee',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-800">{r.fullName}</div>
          <code className="text-[11.5px] text-slate-400 font-mono">{r.code}</code>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (r) => <span className="font-mono text-[12.5px] text-slate-600">{r.phone}</span> },
    { key: 'dept', header: 'Department', render: (r) => <span className="text-slate-700">{r.department?.name ?? '—'}</span> },
    { key: 'desig', header: 'Designation', render: (r) => <span className="text-slate-700">{r.designation?.name ?? '—'}</span> },
    { key: 'joined', header: 'Joined', render: (r) => <span className="text-[12.5px] text-slate-500">{formatDate(r.joiningDate)}</span> },
    { key: 'salary', header: 'Base salary', align: 'right', render: (r) => <span className="tabular-nums text-slate-800">{formatPoisha(r.baseSalary)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusChip label={r.status} tone={r.status === 'ACTIVE' ? 'success' : 'neutral'} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employees"
        subtitle="HR directory · role-linked to admin RBAC · drives attendance + payroll"
        actions={
          <>
            <a href="/hr/attendance" className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">Attendance</a>
            <a href="/hr/payroll" className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">Payroll</a>
            <button
              type="button"
              onClick={() => toast.push({ tone: 'info', title: 'New employee', description: 'Modal in follow-up.' })}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              <Plus className="w-4 h-4" /> New employee
            </button>
          </>
        }
      />
      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading employees…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={UserCog} title="No employees yet" description="Add the first employee to start tracking attendance and payroll." />
        ) : (
          <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
        )}
      </div>
    </div>
  );
}