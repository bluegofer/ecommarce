'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, useToast } from '@/components/ui';
import { useMutation } from '@/lib/hooks';

const inputCls =
  'w-full h-10 px-3 rounded border border-border bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Channel = 'SMS' | 'EMAIL' | 'PUSH';

export function TemplateFormModal({ open, onClose, onSuccess }: Props) {
  const toast = useToast();
  const [key, setKey] = useState('');
  const [channel, setChannel] = useState<Channel>('EMAIL');
  const [subjectEn, setSubjectEn] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [bodyBn, setBodyBn] = useState('');
  const [isActive, setIsActive] = useState(true);

  const upsertMut = useMutation<Record<string, unknown>, unknown>('post', '/api/v1/notifications/templates');

  useEffect(() => {
    if (!open) {
      setKey(''); setChannel('EMAIL'); setSubjectEn('');
      setBodyEn(''); setBodyBn(''); setIsActive(true);
    }
  }, [open]);

  async function submit() {
    if (!key.trim() || !bodyEn.trim() || !bodyBn.trim()) {
      toast.error('Key, body (en), body (bn) are required');
      return;
    }
    const payload: Record<string, unknown> = {
      key: key.trim(),
      channel,
      bodyEn: bodyEn.trim(),
      bodyBn: bodyBn.trim(),
      isActive,
    };
    if (subjectEn.trim()) payload.subjectEn = subjectEn.trim();

    try {
      await upsertMut.mutate(payload);
      toast.success('Template saved');
      onSuccess();
      onClose();
    } catch (e) {
      toast.error('Save failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New notification template"
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700">Cancel</button>
          <button type="button" onClick={() => void submit()} disabled={upsertMut.loading} className="inline-flex items-center gap-1.5 h-9 px-4 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60">
            {upsertMut.loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {upsertMut.loading ? 'Saving…' : 'Save template'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[12.5px] text-slate-500">
          Variables: <code className="font-mono">{'{{orderNumber}}'}</code>, <code className="font-mono">{'{{customerName}}'}</code>, <code className="font-mono">{'{{trackingUrl}}'}</code>
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Template key *" value={key} onChange={setKey} placeholder="order.shipped" />
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Channel *</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)} className={inputCls}>
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
              <option value="PUSH">Push</option>
            </select>
          </div>
        </div>

        {channel === 'EMAIL' && (
          <Field label="Subject (English)" value={subjectEn} onChange={setSubjectEn} placeholder="Your order {{orderNumber}} has shipped" />
        )}

        <div>
          <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Body (English) *</label>
          <textarea value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} rows={4} placeholder="Hi {{customerName}}, your order {{orderNumber}} is on the way." className="w-full p-3 rounded border border-border bg-white text-sm text-slate-700 focus:border-sky-400 focus:outline-none" />
        </div>

        <div>
          <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Body (বাংলা) *</label>
          <textarea value={bodyBn} onChange={(e) => setBodyBn(e.target.value)} rows={4} placeholder="প্রিয় {{customerName}}, আপনার অর্ডার {{orderNumber}} পাঠানো হয়েছে।" className="w-full p-3 rounded border border-border bg-white text-sm text-slate-700 focus:border-sky-400 focus:outline-none" />
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
          <span className="text-sm text-slate-700">Active</span>
        </label>
      </div>
    </Modal>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </div>
  );
}