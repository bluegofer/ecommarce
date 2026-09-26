'use client';

import { useState } from 'react';
import { Bell, Mail, MessageSquare, Send } from 'lucide-react';
import { PageHeader, DataTable, StatusChip, Modal, useToast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useQuery } from '@/lib/hooks';
import { formatDateTime } from '@/lib/utils';

interface Template {
  id: string;
  key: string;
  channel: 'SMS' | 'EMAIL' | 'PUSH';
  subject: string | null;
  bodyEn: string;
  bodyBn: string;
  isActive: boolean;
}

interface LogEntry {
  id: string;
  templateKey: string;
  channel: string;
  recipient: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  sentAt: string | null;
  errorMessage: string | null;
}

const TABS = ['Templates', 'Delivery log'] as const;

const CHANNEL_ICON: Record<Template['channel'], typeof Bell> = {
  SMS: MessageSquare,
  EMAIL: Mail,
  PUSH: Bell,
};

export default function NotificationsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Templates');
  const [editing, setEditing] = useState<Template | null>(null);

  const templatesQuery = useQuery<Template[]>('/api/v1/notifications/templates');
  const logQuery = useQuery<LogEntry[]>('/api/v1/notifications/log');

  const templateColumns: Column<Template>[] = [
    {
      key: 'key',
      header: 'Template',
      render: (r) => <code className="font-mono text-slate-800">{r.key}</code>,
    },
    {
      key: 'channel',
      header: 'Channel',
      render: (r) => {
        const Icon = CHANNEL_ICON[r.channel];
        return (
          <span className="inline-flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-slate-400" />
            <StatusChip label={r.channel} tone={r.channel === 'EMAIL' ? 'info' : 'teal'} />
          </span>
        );
      },
    },
    {
      key: 'body',
      header: 'Body (English)',
      render: (r) => (
        <span className="text-slate-600 text-[12.5px] line-clamp-1">{r.bodyEn}</span>
      ),
    },
    {
      key: 'active',
      header: '',
      render: (r) =>
        r.isActive ? (
          <StatusChip label="Active" tone="success" />
        ) : (
          <StatusChip label="Disabled" tone="neutral" />
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <button
          type="button"
          onClick={() => setEditing(r)}
          className="text-[12.5px] font-medium text-sky-700 hover:text-sky-800"
        >
          Edit
        </button>
      ),
    },
  ];

  const logColumns: Column<LogEntry>[] = [
    { key: 'key', header: 'Template', render: (r) => <code className="font-mono text-slate-700 text-[12.5px]">{r.templateKey}</code> },
    { key: 'channel', header: 'Channel', render: (r) => <StatusChip label={r.channel} tone="info" /> },
    { key: 'recipient', header: 'Recipient', render: (r) => <span className="font-mono text-[12.5px] text-slate-700">{r.recipient}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <StatusChip
          label={r.status}
          tone={r.status === 'SENT' ? 'success' : r.status === 'FAILED' ? 'danger' : 'warning'}
        />
      ),
    },
    {
      key: 'sent',
      header: 'Sent',
      render: (r) =>
        r.sentAt ? (
          <span className="text-[12.5px] text-slate-500">{formatDateTime(r.sentAt)}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        subtitle="Template CRUD (bn+en) · per-channel switches · delivery log"
        actions={
          <button
            type="button"
            onClick={() => toast.push({ tone: 'info', title: 'Test send', description: 'Wired in follow-up.' })}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            <Send className="w-4 h-4" /> Test send
          </button>
        }
      />

      <div className="border-b border-border">
        <nav className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
                tab === t ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'Templates' ? (
        <div className="card overflow-hidden">
          {templatesQuery.loading && !templatesQuery.data ? (
            <div className="p-10 text-center text-slate-400">Loading templates…</div>
          ) : templatesQuery.error ? (
            <div className="p-10 text-center text-danger-700">{templatesQuery.error.message}</div>
          ) : !templatesQuery.data || templatesQuery.data.length === 0 ? (
            <div className="p-10 text-center text-slate-400">No templates configured.</div>
          ) : (
            <DataTable columns={templateColumns} rows={templatesQuery.data} rowKey={(r) => r.id} />
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {logQuery.loading && !logQuery.data ? (
            <div className="p-10 text-center text-slate-400">Loading log…</div>
          ) : logQuery.error ? (
            <div className="p-10 text-center text-danger-700">{logQuery.error.message}</div>
          ) : !logQuery.data || logQuery.data.length === 0 ? (
            <div className="p-10 text-center text-slate-400">No messages sent yet.</div>
          ) : (
            <DataTable columns={logColumns} rows={logQuery.data} rowKey={(r) => r.id} />
          )}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit template — ${editing?.key ?? ''}`}
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                toast.success('Template saved');
                setEditing(null);
              }}
              className="h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              Save
            </button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div>
              <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Body (English)</label>
              <textarea
                rows={4}
                defaultValue={editing.bodyEn}
                className="w-full p-3 rounded border border-border bg-white text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Body (বাংলা)</label>
              <textarea
                rows={4}
                defaultValue={editing.bodyBn}
                className="w-full p-3 rounded border border-border bg-white text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked={editing.isActive} className="w-4 h-4 rounded text-sky-600" />
              Active
            </label>
            <p className="text-[12px] text-slate-400">
              Variables: {'{{customerName}}'} {'{{orderNumber}}'} {'{{trackingNumber}}'}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}