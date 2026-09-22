'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, Save } from 'lucide-react';
import { PageHeader, StatusChip, useToast } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';

interface Employee {
  id: string;
  fullName: string;
  code: string;
}

interface AttendanceRow {
  employeeId: string;
  days?: Record<number, 'P' | 'A' | 'L' | 'OT' | '-'>;
  presentDays: number;
  absentDays: number;
  lateCount?: number;
  overtimeMinutes: number;
  leaveDays: number;
}

const CYCLE: Array<'P' | 'A' | 'L' | 'OT' | '-'> = ['P', 'A', 'L', 'OT', '-'];

export default function AttendancePage() {
  const toast = useToast();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const { data: employees } = useQuery<Employee[]>('/api/v1/hr/employees');
  const { data: summary, loading, error, refetch } = useQuery<AttendanceRow[]>(
    `/api/v1/hr/attendance/summary?month=${month}`,
  );

  // Defensive: guard against non-array responses (401/404/null)
  const summaryRows = Array.isArray(summary) ? summary : [];
  const employeeRows = Array.isArray(employees) ? employees : [];

  const markMutation = useMutation<{ month: string; rows: AttendanceRow[] }, unknown>(
    'post',
    '/api/v1/hr/attendance/bulk',
  );

  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();

  return (
    <div className="space-y-5">
      <Link href="/hr/employees" className="text-sm font-medium text-slate-500 hover:text-slate-800">← Back to employees</Link>
      <PageHeader
        title="Attendance"
        subtitle="Present / Absent / Late / Overtime / Leave · monthly grid feeds payroll"
        actions={
          <>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 px-3 rounded border border-border bg-white text-sm"
            />
            <button
              type="button"
              onClick={async () => {
                if (summaryRows.length === 0) return;
                await markMutation.mutate({ month, rows: summaryRows });
                toast.success('Attendance saved');
                void refetch();
              }}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              <Save className="w-4 h-4" /> Save
            </button>
          </>
        }
      />

      <div className="card overflow-x-auto">
        {loading && !summary ? (
          <div className="p-10 text-center text-slate-400">Loading attendance…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : summaryRows.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Calendar className="w-8 h-8 mx-auto mb-3 text-slate-300" />
            No attendance rows for this month.
          </div>
        ) : (
          <table className="w-full text-sm min-w-max">
            <thead className="bg-slate-50 border-b border-border sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase sticky left-0 bg-slate-50">Employee</th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <th key={d} className="px-1.5 py-2 text-center text-[11px] font-semibold text-slate-500 uppercase w-9">{d}</th>
                ))}
                <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {summaryRows.map((row) => {
                const emp = employeeRows.find((e) => e.id === row.employeeId);
                return (
                  <tr key={row.employeeId}>
                    <td className="px-3 py-2 sticky left-0 bg-white">
                      <div className="font-medium text-slate-800 whitespace-nowrap">{emp?.fullName ?? row.employeeId}</div>
                      <code className="text-[11px] text-slate-400 font-mono">{emp?.code}</code>
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                      const v = row.days?.[d] ?? '-';
                      return (
                        <td key={d} className="px-1.5 py-2 text-center">
                          <span className={`inline-grid place-items-center w-7 h-7 rounded text-[11px] font-semibold ${
                            v === 'P' ? 'bg-success-100 text-success-700'
                            : v === 'A' ? 'bg-danger-100 text-danger-700'
                            : v === 'L' ? 'bg-warning-100 text-warning-700'
                            : v === 'OT' ? 'bg-sky-100 text-sky-700'
                            : 'bg-slate-100 text-slate-400'
                          }`}>
                            {v}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right whitespace-nowrap text-[12px] text-slate-600">
                      <div>P: <strong>{row.presentDays}</strong> · A: <strong>{row.absentDays}</strong></div>
                      <div>OT: <strong>{Math.round(row.overtimeMinutes / 60)}h</strong> · L: <strong>{row.leaveDays}</strong></div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card p-4 flex items-center gap-4 text-[12px] text-slate-500">
        <span className="font-medium text-slate-600">Legend:</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-success-100 grid place-items-center text-success-700 text-[10px] font-semibold">P</span> Present</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-danger-100 grid place-items-center text-danger-700 text-[10px] font-semibold">A</span> Absent</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-warning-100 grid place-items-center text-warning-700 text-[10px] font-semibold">L</span> Leave</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-sky-100 grid place-items-center text-sky-700 text-[10px] font-semibold">OT</span> Overtime</span>
      </div>
    </div>
  );
}