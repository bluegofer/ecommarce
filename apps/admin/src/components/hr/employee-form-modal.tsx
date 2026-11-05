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

export function EmployeeFormModal({ open, onClose, onSuccess }: Props) {
  const toast = useToast();
  const [employeeCode, setEmployeeCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [fullNameBn, setFullNameBn] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [nidNumber, setNidNumber] = useState('');
  const [notes, setNotes] = useState('');

  const createMut = useMutation<Record<string, unknown>, unknown>('post', '/api/v1/hr/employees');

  useEffect(() => {
    if (!open) {
      setEmployeeCode(''); setFullName(''); setFullNameBn('');
      setPhone(''); setEmail(''); setJoiningDate('');
      setNidNumber(''); setNotes('');
    }
  }, [open]);

  async function submit() {
    if (!employeeCode.trim() || !fullName.trim() || !phone.trim() || !joiningDate) {
      toast.error('Employee code, name, phone, joining date are required');
      return;
    }
    const payload: Record<string, unknown> = {
      employeeCode: employeeCode.trim(),
      fullName: fullName.trim(),
      phone: phone.trim(),
      joiningDate: new Date(joiningDate).toISOString(),
    };
    if (fullNameBn.trim()) payload.fullNameBn = fullNameBn.trim();
    if (email.trim()) payload.email = email.trim();
    if (nidNumber.trim()) payload.nidNumber = nidNumber.trim();
    if (notes.trim()) payload.notes = notes.trim();

    try {
      await createMut.mutate(payload);
      toast.success('Employee created');
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
      title="New employee"
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
          <Field label="Employee code *" value={employeeCode} onChange={setEmployeeCode} placeholder="EMP-001" />
          <Field label="Full name *" value={fullName} onChange={setFullName} placeholder="Rahim Uddin" />
        </div>
        <Field label="Full name (বাংলা)" value={fullNameBn} onChange={setFullNameBn} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone *" value={phone} onChange={setPhone} placeholder="+8801..." />
          <Field label="Email" value={email} onChange={setEmail} type="email" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Joining date *</label>
            <input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} className={inputCls} />
          </div>
          <Field label="NID number" value={nidNumber} onChange={setNidNumber} />
        </div>
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