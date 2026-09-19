'use client';

import { useState } from 'react';
import { RotateCcw, MessageSquare, Clock } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, useToast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';

interface RmaRequest {
  id: string;
  orderNumber: string;
  customerName: string;
  reason: string;
  status: 'REQUESTED' | 'APPROVED' | 'PICKED_UP' | 'RECEIVED' | 'RESOLVED' | 'REJECTED';
  createdAt: string;
}

interface Ticket {
  id: string;
  subject: string;
  customerName: string;
  status: 'OPEN' | 'PENDING' | 'RESOLVED';
  agingHours: number;
  lastMessageAt: string;
}

const RMA_TONE: Record<RmaRequest['status'], 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  REQUESTED: 'info',
  APPROVED: 'info',
  PICKED_UP: 'warning',
  RECEIVED: 'warning',
  RESOLVED: 'success',
  REJECTED: 'danger',
};

const TICKET_TONE: Record<Ticket['status'], 'info' | 'warning' | 'success'> = {
  OPEN: 'info',
  PENDING: 'warning',
  RESOLVED: 'success',
};

const TABS = ['Returns', 'Tickets'] as const;

export default function ReturnsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Returns');

  const rmaQuery = useQuery<RmaRequest[]>('/api/v1/returns');
  const ticketsQuery = useQuery<Ticket[]>('/api/v1/tickets');

  const approveMutation = useMutation<void, unknown>('post', (input) =>
    `/api/v1/returns/${(input as unknown as string)}/approve`,
  );
  const rejectMutation = useMutation<{ id: string; reason: string }, unknown>(
    'post',
    (input) => `/api/v1/returns/${(input as { id: string }).id}/reject`,
  );

  const rmaColumns: Column<RmaRequest>[] = [
    {
      key: 'order',
      header: 'Order',
      render: (r) => <code className="font-mono text-slate-800">{r.orderNumber}</code>,
    },
    { key: 'customer', header: 'Customer', render: (r) => r.customerName },
    { key: 'reason', header: 'Reason', render: (r) => <span className="text-slate-600">{r.reason}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusChip label={r.status.replace('_', ' ')} tone={RMA_TONE[r.status]} />,
    },
    {
      key: 'created',
      header: 'Requested',
      render: (r) => (
        <span className="text-[12.5px] text-slate-500">
          {new Date(r.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) =>
        r.status === 'REQUESTED' ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={async () => {
                await approveMutation.mutate(r.id as unknown as void);
                toast.success('Return approved');
                void rmaQuery.refetch();
              }}
              className="text-[12.5px] font-medium text-success-700 hover:text-success-600"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={async () => {
                await rejectMutation.mutate({ id: r.id, reason: 'Not eligible' });
                toast.success('Return rejected');
                void rmaQuery.refetch();
              }}
              className="text-[12.5px] font-medium text-danger-700 hover:text-danger-600"
            >
              Reject
            </button>
          </div>
        ) : null,
    },
  ];

  const ticketColumns: Column<Ticket>[] = [
    { key: 'subject', header: 'Subject', render: (r) => <span className="font-medium text-slate-800">{r.subject}</span> },
    { key: 'customer', header: 'Customer', render: (r) => r.customerName },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusChip label={r.status} tone={TICKET_TONE[r.status]} />,
    },
    {
      key: 'aging',
      header: 'Aging',
      align: 'right',
      render: (r) => (
        <span className={`tabular-nums ${r.agingHours > 24 ? 'text-danger-700 font-medium' : 'text-slate-600'}`}>
          {r.agingHours}h
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Returns & Support"
        subtitle="RMA workflow + ticket inbox with SLA aging"
      />

      <div className="border-b border-border">
        <nav className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
                tab === t
                  ? 'border-sky-600 text-sky-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t === 'Returns' ? <RotateCcw className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
              {t}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'Returns' ? (
        <div className="card overflow-hidden">
          {rmaQuery.loading && !rmaQuery.data ? (
            <div className="p-10 text-center text-slate-400">Loading returns…</div>
          ) : rmaQuery.error ? (
            <div className="p-10 text-center text-danger-700">{rmaQuery.error.message}</div>
          ) : !rmaQuery.data || rmaQuery.data.length === 0 ? (
            <div className="p-10 text-center text-slate-400">No return requests.</div>
          ) : (
            <DataTable columns={rmaColumns} rows={rmaQuery.data} rowKey={(r) => r.id} />
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {ticketsQuery.loading && !ticketsQuery.data ? (
            <div className="p-10 text-center text-slate-400">Loading tickets…</div>
          ) : ticketsQuery.error ? (
            <div className="p-10 text-center text-danger-700">{ticketsQuery.error.message}</div>
          ) : !ticketsQuery.data || ticketsQuery.data.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto text-slate-300 mb-3" />
              No open tickets.
            </div>
          ) : (
            <DataTable columns={ticketColumns} rows={ticketsQuery.data} rowKey={(r) => r.id} />
          )}
        </div>
      )}
    </div>
  );
}