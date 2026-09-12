'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Banknote, Play, CheckCircle2, Wallet } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, EmptyState, useToast, Modal } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';
import { formatPoisha, formatDate } from '@/lib/utils';

interface PayrollRun {
  id: string;
  month: string;
  status: 'DRAFT' | 'FINALIZED' | 'PAID';
  employeeCount: number;
  totalGrossPoisha: number;
  totalNetPoisha: number;
  createdAt: string;
}

const STATUS_TONE: Record<PayrollRun['status'], 'warning' | 'info' | 'success'> = {
  DRAFT: 'warning',
  FINALIZED: 'info',
  PAID: 'success',
};

export default function PayrollPage() {
  const toast = useToast();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [payRun, setPayRun] = useState<PayrollRun | null>(null);
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK' | 'MFS'>('MFS');

  const { data, loading, error, refetch } = useQuery<PayrollRun[]>('/api/v1/hr/payroll');
  const generateMutation = useMutation<{ month: string }, unknown>('post', '/api/v1/hr/payroll/generate');
  const finalizeMutation = useMutation<string, unknown>('post', (input) => `/api/v1/hr/payroll/${input as unknown as string}/finalize`);
  const payMutation = useMutation<{ id: string; method: string }, unknown>('post', (input) => `/api/v1/hr/payroll/${(input as { id: string }).id}/pay`);

  const columns: Column<PayrollRun>[] = [
    { key: 'month', header: 'Month', render: (r) => <span className="font-medium text-slate-800">{r.month}</span> },
    { key: 'emp', header: 'Employees', align: 'center', render: (r) => <span className="tabular-nums">{r.employeeCount}</span> },
    { key: 'gross', header: 'Gross', align: 'right', render: (r) => <span className="tabular-nums text-slate-700">{formatPoisha(r.totalGrossPoisha)}</span> },
    { key: 'net', header: 'Net payout', align: 'right', render: (r) => <span className="tabular-nums font-semibold text-sky-700">{formatPoisha(r.totalNetPoisha)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusChip label={r.status} tone={STATUS_TONE[r.status]} /> },
    { key: 'created', header: 'Created', render: (r) => <span className="text-[12.5px] text-slate-500">{formatDate(r.createdAt)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          {r.status === 'DRAFT' && (
            <button
              type="button"
              onClick={async () => {
                await finalizeMutation.mutate(r.id);
                toast.success('Payroll finalized');
                void refetch();
              }}
              className="text-[12.5px] font-medium text-sky-700 hover:text-sky-800"
            >
              Finalize
            </button>
          )}
          {r.status === 'FINALIZED' && (
            <button
              type="button"
              onClick={() => setPayRun(r)}
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-success-700 hover:text-success-600"
            >
              <Wallet className="w-3.5 h-3.5" /> Pay
            </button>
          )}
          {r.status === 'PAID' && <CheckCircle2 className="w-4 h-4 text-success-600" />}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <Link href="/hr/employees" className="text-sm font-medium text-slate-500 hover:text-slate-800">← Back to employees</Link>
      <PageHeader
        title="Payroll"
        subtitle="Generate from attendance · finalize · pay · auto-posts to accounting"
        actions={
          <button
            type="button"
            onClick={() => setGenerateOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            <Play className="w-4 h-4" /> Generate run
          </button>
        }
      />
      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading runs…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={Banknote} title="No payroll runs yet" description="Generate the first run from recorded attendance." />
        ) : (
          <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
        )}
      </div>

      <Modal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="Generate payroll"
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setGenerateOpen(false)} className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700">Cancel</button>
            <button
              type="button"
              onClick={async () => {
                await generateMutation.mutate({ month });
                toast.success('Payroll generated');
                setGenerateOpen(false);
                void refetch();
              }}
              className="h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              Generate
            </button>
          </>
        }
      >
        <div>
          <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Month</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full h-10 px-3 rounded border border-border bg-white text-sm" />
        </div>
        <p className="text-[11.5px] text-slate-400 mt-2">Re-running a DRAFT month replaces payslips. Posted runs are locked.</p>
      </Modal>

      <Modal
        open={!!payRun}
        onClose={() => setPayRun(null)}
        title="Record payment"
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setPayRun(null)} className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700">Cancel</button>
            <button
              type="button"
              onClick={async () => {
                if (!payRun) return;
                await payMutation.mutate({ id: payRun.id, method: payMethod });
                toast.success('Payment recorded', 'Ledger updated');
                setPayRun(null);
                void refetch();
              }}
              className="h-9 px-3 rounded bg-success-600 text-white text-sm font-medium hover:bg-success-700"
            >
              Confirm payment
            </button>
          </>
        }
      >
        <div>
          <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Method</label>
          <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as typeof payMethod)} className="w-full h-10 px-3 rounded border border-border bg-white text-sm">
            <option value="CASH">Cash</option>
            <option value="BANK">Bank transfer</option>
            <option value="MFS">MFS (bKash/Nagad)</option>
          </select>
        </div>
      </Modal>
    </div>
  );
}