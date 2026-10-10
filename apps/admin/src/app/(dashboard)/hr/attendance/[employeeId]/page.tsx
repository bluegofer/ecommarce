'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import { useParams } from 'next/navigation';
import { PageHeader, DataTable, StatusChip, EmptyState } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery } from '@/lib/hooks';

interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  department?: { name: string } | null;
}

interface AttendanceRecord {
  id: string;
  workDate: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'HOLIDAY';
  overtimeMins: number;
  note: string | null;
}

const STATUS_TONE: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  PRESENT: 'success',
  ABSENT: 'danger',
  LATE: 'warning',
  LEAVE: 'neutral',
  HOLIDAY: 'neutral',
};

export default function EmployeeAttendancePage() {
  const params = useParams<{ employeeId: string }>();
  const employeeId = params?.employeeId;

  // Fetch employee details
  const empQuery = useQuery<Employee>(
    employeeId ? `/api/v1/hr/employees/${employeeId}` : null,
  );

  // Fetch current month's attendance
  const range = useMemo(() => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const from = new Date(Date.UTC(y, m, 1)).toISOString();
    const to = new Date(Date.UTC(y, m + 1, 1)).toISOString();
    return { from, to };
  }, []);

  const recordsQuery = useQuery<AttendanceRecord[]>(
    employeeId
      ? `/api/v1/hr/attendance?employeeId=${employeeId}&from=${range.from}&to=${range.to}`
      : null,
  );

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (r) => (
        <span className="text-slate-700">
          {new Date(r.workDate).toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusChip label={r.status} tone={STATUS_TONE[r.status] ?? 'neutral'} />,
    },
    {
      key: 'ot',
      header: 'Overtime',
      align: 'right',
      render: (r) =>
        r.overtimeMins > 0 ? (
          <span className="tabular-nums text-sky-700">
            {Math.floor(r.overtimeMins / 60)}h {r.overtimeMins % 60}m
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'note',
      header: 'Note',
      render: (r) => <span className="text-[12.5px] text-slate-500">{r.note ?? '—'}</span>,
    },
  ];

  const records = Array.isArray(recordsQuery.data) ? recordsQuery.data : [];
  const summary = records.reduce(
    (acc, r) => {
      if (r.status === 'PRESENT') acc.present += 1;
      else if (r.status === 'LATE') { acc.present += 1; acc.late += 1; }
      else if (r.status === 'ABSENT') acc.absent += 1;
      else if (r.status === 'LEAVE') acc.leave += 1;
      acc.otMins += r.overtimeMins;
      return acc;
    },
    { present: 0, absent: 0, late: 0, leave: 0, otMins: 0 },
  );

  if (empQuery.loading && !empQuery.data) {
    return <div className="p-10 text-center text-slate-400">Loading employee…</div>;
  }
  if (empQuery.error || !empQuery.data) {
    return (
      <div className="p-10 text-center">
        <p className="font-medium text-danger-700">Employee not found</p>
        <Link href="/hr/attendance" className="mt-4 inline-block text-sky-700 font-medium hover:underline">
          ← Back to attendance
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/hr/attendance"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" /> Back to attendance
      </Link>

      <PageHeader
        title={`${empQuery.data.fullName} (${empQuery.data.employeeCode})`}
        subtitle={empQuery.data.department?.name ?? 'No department'}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="Present days" value={summary.present} tone="success" />
        <Stat label="Absent" value={summary.absent} tone="danger" />
        <Stat label="Late" value={summary.late} tone="warning" />
        <Stat label="Leave" value={summary.leave} tone="neutral" />
        <Stat
          label="Overtime"
          value={`${Math.floor(summary.otMins / 60)}h ${summary.otMins % 60}m`}
          tone="info"
        />
      </div>

      {/* Records table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <h3 className="font-semibold text-slate-900">Current month attendance</h3>
        </div>
        {recordsQuery.loading && !recordsQuery.data ? (
          <div className="p-10 text-center text-slate-400">Loading records…</div>
        ) : recordsQuery.error ? (
          <div className="p-10 text-center text-danger-700">{recordsQuery.error.message}</div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No attendance records"
            description="No entries have been recorded for the current month."
          />
        ) : (
          <DataTable columns={columns} rows={records} rowKey={(r) => r.id} />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone: 'success' | 'danger' | 'warning' | 'neutral' | 'info' }) {
  const toneClass = {
    success: 'text-success-700',
    danger: 'text-danger-700',
    warning: 'text-warning-700',
    neutral: 'text-slate-700',
    info: 'text-sky-700',
  }[tone];
  return (
    <div className="card p-3">
      <p className="text-[11.5px] text-slate-500">{label}</p>
      <p className={`text-lg font-semibold tabular-nums mt-0.5 ${toneClass}`}>{value}</p>
    </div>
  );
}