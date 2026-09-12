'use client';

import { useState } from 'react';
import { Truck, Save } from 'lucide-react';
import { PageHeader, useToast } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';

interface Zone {
  id: string;
  name: string;
  chargePoisha: number;
  freeShipThresholdPoisha: number | null;
}

interface DeliverySettings {
  zones: Zone[];
  codFeeRulesPoisha: number | null;
}

export default function DeliverySettingsPage() {
  const toast = useToast();
  const { data, loading, error } = useQuery<DeliverySettings>('/api/v1/settings/delivery');
  const saveMutation = useMutation<DeliverySettings, unknown>('patch', '/api/v1/settings/delivery');

  const [draft, setDraft] = useState<DeliverySettings | null>(null);
  const current = draft ?? data ?? null;

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Delivery zones & charges"
        subtitle="Inside Dhaka / Outside Dhaka · free-shipping threshold per D-12"
        actions={
          <button
            type="button"
            disabled={!current}
            onClick={async () => {
              if (!current) return;
              await saveMutation.mutate(current);
              toast.success('Delivery settings saved');
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> Save
          </button>
        }
      />

      {loading && !data ? (
        <div className="card p-10 text-center text-slate-400">Loading…</div>
      ) : error ? (
        <div className="card p-10 text-center text-danger-700">{error.message}</div>
      ) : !current ? (
        <div className="card p-10 text-center text-slate-400">No delivery configuration yet.</div>
      ) : (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-slate-900">Zones</h3>
          {current.zones.map((zone, idx) => (
            <div key={zone.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end p-3 rounded bg-slate-50 border border-border">
              <div>
                <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Zone name</label>
                <input
                  type="text"
                  value={zone.name}
                  onChange={(e) => {
                    const zones = [...current.zones];
                    zones[idx] = { ...zone, name: e.target.value };
                    setDraft({ ...current, zones });
                  }}
                  className="w-full h-9 px-2.5 rounded border border-border bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Charge (poisha)</label>
                <input
                  type="number"
                  value={zone.chargePoisha}
                  onChange={(e) => {
                    const zones = [...current.zones];
                    zones[idx] = { ...zone, chargePoisha: parseInt(e.target.value, 10) || 0 };
                    setDraft({ ...current, zones });
                  }}
                  className="w-full h-9 px-2.5 rounded border border-border bg-white text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Free ship at (poisha)</label>
                <input
                  type="number"
                  value={zone.freeShipThresholdPoisha ?? 0}
                  onChange={(e) => {
                    const zones = [...current.zones];
                    const v = parseInt(e.target.value, 10) || 0;
                    zones[idx] = { ...zone, freeShipThresholdPoisha: v > 0 ? v : null };
                    setDraft({ ...current, zones });
                  }}
                  className="w-full h-9 px-2.5 rounded border border-border bg-white text-sm tabular-nums"
                />
              </div>
            </div>
          ))}
          <p className="text-[11.5px] text-slate-400">Values in poisha (÷100 for BDT). D-12 default free-ship threshold = 150000 (৳1,500).</p>
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Truck className="w-4 h-4 text-slate-400" /> COD fee
        </h3>
        <p className="text-[12.5px] text-slate-500">
          D-13 (COD fee rules) is OPEN pending client confirmation. Configured at Step 13.
        </p>
      </div>
    </div>
  );
}