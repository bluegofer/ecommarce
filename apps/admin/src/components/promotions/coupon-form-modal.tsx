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

type CouponType = 'PERCENT' | 'FIXED' | 'FREE_SHIPPING';

export function CouponFormModal({ open, onClose, onSuccess }: Props) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [type, setType] = useState<CouponType>('PERCENT');
  const [valuePercent, setValuePercent] = useState('');
  const [valueTaka, setValueTaka] = useState('');
  const [minOrderTaka, setMinOrderTaka] = useState('');
  const [totalUsageLimit, setTotalUsageLimit] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isActive, setIsActive] = useState(true);

  const createMut = useMutation<Record<string, unknown>, unknown>('post', '/api/v1/coupons');

  useEffect(() => {
    if (!open) {
      setCode(''); setType('PERCENT'); setValuePercent(''); setValueTaka('');
      setMinOrderTaka(''); setTotalUsageLimit(''); setValidFrom(''); setValidUntil('');
      setIsActive(true);
    }
  }, [open]);

  async function submit() {
    if (!code.trim()) {
      toast.error('Coupon code is required');
      return;
    }
    const payload: Record<string, unknown> = {
      code: code.trim().toUpperCase(),
      type,
      isActive,
    };
    if (type === 'PERCENT' && valuePercent) payload.valuePercent = Number(valuePercent);
    if (type === 'FIXED' && valueTaka) payload.valuePoisha = Math.round(Number(valueTaka) * 100);
    if (minOrderTaka) payload.minOrderPoisha = Math.round(Number(minOrderTaka) * 100);
    if (totalUsageLimit) payload.totalUsageLimit = Number(totalUsageLimit);
    if (validFrom) payload.validFrom = new Date(validFrom).toISOString();
    if (validUntil) payload.validUntil = new Date(validUntil).toISOString();

    try {
      await createMut.mutate(payload);
      toast.success('Coupon created');
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
      title="New coupon"
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
          <Field label="Code *" value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="EID2026" />
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Type *</label>
            <select value={type} onChange={(e) => setType(e.target.value as CouponType)} className={inputCls}>
              <option value="PERCENT">Percentage off</option>
              <option value="FIXED">Fixed amount off</option>
              <option value="FREE_SHIPPING">Free shipping</option>
            </select>
          </div>
        </div>

        {type === 'PERCENT' && (
          <Field label="Discount (%)" value={valuePercent} onChange={setValuePercent} placeholder="10" type="number" />
        )}
        {type === 'FIXED' && (
          <Field label="Discount amount (৳)" value={valueTaka} onChange={setValueTaka} placeholder="200" type="number" />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Min order (৳)" value={minOrderTaka} onChange={setMinOrderTaka} placeholder="1500" type="number" />
          <Field label="Total usage limit" value={totalUsageLimit} onChange={setTotalUsageLimit} placeholder="100" type="number" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Valid from</label>
            <input type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Valid until</label>
            <input type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputCls} />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
          <span className="text-sm text-slate-700">Active immediately</span>
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