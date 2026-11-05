'use client';

import { Save, CreditCard } from 'lucide-react';
import { PageHeader, useToast, StatusChip } from '@/components/ui';

export default function CheckoutSettingsPage() {
  const toast = useToast();

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Checkout settings"
        subtitle="COD limits · OTP provider · payment method availability"
        actions={
          <button
            type="button"
            onClick={() => toast.success('Checkout settings saved')}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            <Save className="w-4 h-4" /> Save
          </button>
        }
      />

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Payment methods</h3>
        <div className="space-y-2">
          {['bKash', 'Nagad', 'SSLCommerz (Card / Net Banking)', 'Cash on Delivery'].map((m) => (
            <label key={m} className="flex items-center gap-3 p-3 rounded border border-border bg-slate-50">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-sky-600" />
              <span className="text-sm text-slate-700">{m}</span>
              <StatusChip label="Live after Step 13" tone="warning" className="ml-auto" />
            </label>
          ))}
        </div>
        <p className="text-[11.5px] text-slate-400">
          Payment adapters (D-08, D-21) are wired in Step 13. COD completes end-to-end today.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-slate-400" /> COD limits
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Max order value (poisha)</label>
            <input type="number" defaultValue={500000} className="w-full h-10 px-3 rounded border border-border bg-white text-sm tabular-nums" />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">COD fee (poisha)</label>
            <input type="number" defaultValue={0} className="w-full h-10 px-3 rounded border border-border bg-white text-sm tabular-nums" />
          </div>
        </div>
        <p className="text-[11.5px] text-slate-400">D-13 (COD fee rules) pending client confirmation — Step 13.</p>
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">OTP provider</h3>
        <select className="w-full h-10 px-3 rounded border border-border bg-white text-sm">
          <option>Pending D-09 (SMS aggregator)</option>
          <option>Local BD aggregator (mock)</option>
          <option>Dev-mode (log OTP to console)</option>
        </select>
      </div>
    </div>
  );
}