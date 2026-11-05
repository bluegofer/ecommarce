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

export function SupplierFormModal({ open, onClose, onSuccess }: Props) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');

  const createMut = useMutation<Record<string, unknown>, unknown>('post', '/api/v1/suppliers');

  useEffect(() => {
    if (!open) {
      setCode(''); setName(''); setContactPerson(''); setPhone('');
      setEmail(''); setTaxId(''); setPaymentTerms(''); setNotes('');
    }
  }, [open]);

  async function submit() {
    if (!code.trim() || !name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    const payload: Record<string, unknown> = {
      code: code.trim(),
      name: name.trim(),
    };
    if (contactPerson.trim()) payload.contactPerson = contactPerson.trim();
    if (phone.trim()) payload.phone = phone.trim();
    if (email.trim()) payload.email = email.trim();
    if (taxId.trim()) payload.taxId = taxId.trim();
    if (paymentTerms.trim()) payload.paymentTerms = paymentTerms.trim();
    if (notes.trim()) payload.notes = notes.trim();

    try {
      await createMut.mutate(payload);
      toast.success('Supplier created');
      onSuccess();
      onClose();
    } catch (e) {
      toast.error('Create failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New supplier"
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700">Cancel</button>
          <button type="button" onClick={() => void submit()} disabled={createMut.loading} className="inline-flex items-center gap-1.5 h-9 px-4 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60">
            {createMut.loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {createMut.loading ? 'Creating…' : 'Create'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code *" value={code} onChange={setCode} placeholder="SUP-001" />
          <Field label="Name *" value={name} onChange={setName} placeholder="Acme Trading" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact person" value={contactPerson} onChange={setContactPerson} />
          <Field label="Phone" value={phone} onChange={setPhone} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" value={email} onChange={setEmail} type="email" />
          <Field label="Tax ID" value={taxId} onChange={setTaxId} />
        </div>
        <Field label="Payment terms" value={paymentTerms} onChange={setPaymentTerms} placeholder="Net 30" />
        <div>
          <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full p-3 rounded border border-border bg-white text-sm text-slate-700 focus:border-sky-400 focus:outline-none" />
        </div>
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