'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Search, RefreshCcw } from 'lucide-react';
import { PageHeader, StatusChip, Modal, useToast } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';
import { formatPoisha, formatDateTime } from '@/lib/utils';

interface PosSaleLookup {
  id: string;
  receiptNumber: string;
  total: number;
  createdAt: string;
  items: Array<{
    id: string;
    sku: string;
    title: string;
    quantity: number;
    unitPrice: number;
    returnedQty: number;
  }>;
}

type Mode = 'return' | 'exchange';

export default function PosReturnsPage() {
  const toast = useToast();
  const [receipt, setReceipt] = useState('');
  const [sale, setSale] = useState<PosSaleLookup | null>(null);
  const [mode, setMode] = useState<Mode>('return');
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'CARD' | 'MFS_BKASH' | 'MFS_NAGAD' | 'MFS_ROCKET'>('CASH');
  const [exchangeVariantId, setExchangeVariantId] = useState('');
  const [exchangeQty, setExchangeQty] = useState(1);

  const lookupMutation = useMutation<{ receipt: string }, PosSaleLookup>(
    'get' as never,
    (input) => `/api/v1/pos/sales/lookup?receipt=${encodeURIComponent((input as { receipt: string }).receipt)}`,
  );
  const returnMutation = useMutation<
    { id: string; items: Array<{ posSaleItemId: string; quantity: number }>; refundMethod: string; reason?: string },
    unknown
  >('post', (input) => `/api/v1/pos/sales/${(input as { id: string }).id}/return`);
  const exchangeMutation = useMutation<
    {
      id: string;
      items: Array<{ posSaleItemId: string; quantity: number }>;
      refundMethod: string;
      exchangeVariantIds: Array<{ variantId: string; quantity: number }>;
    },
    { delta: number; settlement: 'CUSTOMER_PAYS' | 'REFUND' | 'EVEN' }
  >('post', (input) => `/api/v1/pos/sales/${(input as { id: string }).id}/exchange`);

  async function doLookup() {
    if (!receipt.trim()) return;
    try {
      const s = await lookupMutation.mutate({ receipt: receipt.trim() });
      setSale(s);
      setSelected({});
    } catch {
      toast.error('Not found', `No sale matches receipt ${receipt}`);
    }
  }

  async function submit() {
    if (!sale) return;
    const items = Object.entries(selected)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({ posSaleItemId: id, quantity: q }));
    if (items.length === 0) {
      toast.error('Select at least one item');
      return;
    }
    try {
      if (mode === 'return') {
        await returnMutation.mutate({ id: sale.id, items, refundMethod, reason: 'Customer return' });
        toast.success('Return processed');
      } else {
        if (!exchangeVariantId) {
          toast.error('Pick exchange variant');
          return;
        }
        const res = await exchangeMutation.mutate({
          id: sale.id,
          items,
          refundMethod,
          exchangeVariantIds: [{ variantId: exchangeVariantId, quantity: exchangeQty }],
        });
        toast.success(
          res.settlement === 'EVEN'
            ? 'Even exchange'
            : res.settlement === 'CUSTOMER_PAYS'
              ? `Customer pays ${formatPoisha(res.delta)}`
              : `Refund ${formatPoisha(Math.abs(res.delta))}`,
        );
      }
      setSale(null);
      setSelected({});
      setReceipt('');
    } catch (e) {
      toast.error('Failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <Link href="/pos" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> Back to register
      </Link>

      <PageHeader
        title="POS Returns & Exchange"
        subtitle="Look up a sale by receipt · return restocks + reverses ledger · exchange computes money delta"
      />

      <div className="card p-4">
        <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
          Receipt number
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void doLookup()}
              placeholder="POS-XXXX-000123"
              className="w-full h-10 pl-9 pr-3 rounded border border-border bg-white text-sm font-mono"
            />
          </div>
          <button
            type="button"
            onClick={() => void doLookup()}
            className="h-10 px-4 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            Look up
          </button>
        </div>
      </div>

      {sale && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-semibold text-slate-900">{sale.receiptNumber}</div>
              <div className="text-[12.5px] text-slate-500">
                {formatDateTime(sale.createdAt)} · Total {formatPoisha(sale.total)}
              </div>
            </div>
            <div className="inline-flex rounded border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setMode('return')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium ${
                  mode === 'return' ? 'bg-sky-600 text-white' : 'bg-white text-slate-700'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Return
              </button>
              <button
                type="button"
                onClick={() => setMode('exchange')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium ${
                  mode === 'exchange' ? 'bg-sky-600 text-white' : 'bg-white text-slate-700'
                }`}
              >
                <RefreshCcw className="w-3.5 h-3.5" /> Exchange
              </button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-border">
              <tr>
                <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-slate-500 uppercase">Return</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-slate-500 uppercase">Item</th>
                <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-slate-500 uppercase">Sold</th>
                <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-slate-500 uppercase">Returned</th>
                <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-slate-500 uppercase">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sale.items.map((it) => {
                const remaining = it.quantity - it.returnedQty;
                return (
                  <tr key={it.id}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        disabled={remaining <= 0}
                        checked={(selected[it.id] ?? 0) > 0}
                        onChange={(e) =>
                          setSelected((s) => ({ ...s, [it.id]: e.target.checked ? 1 : 0 }))
                        }
                        className="w-4 h-4 rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{it.title}</div>
                      <code className="text-[11.5px] text-slate-400 font-mono">{it.sku}</code>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{it.quantity}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{it.returnedQty}</td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        min={0}
                        max={remaining}
                        disabled={remaining <= 0}
                        value={selected[it.id] ?? 0}
                        onChange={(e) => {
                          const v = Math.min(remaining, Math.max(0, parseInt(e.target.value, 10) || 0));
                          setSelected((s) => ({ ...s, [it.id]: v }));
                        }}
                        className="w-20 h-8 px-2 rounded border border-border bg-white text-sm tabular-nums text-right"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="p-5 border-t border-border space-y-3">
            <div>
              <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
                {mode === 'return' ? 'Refund method' : 'Settle via'}
              </label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as typeof refundMethod)}
                className="w-full h-10 px-3 rounded border border-border bg-white text-sm"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="MFS_BKASH">bKash</option>
                <option value="MFS_NAGAD">Nagad</option>
                <option value="MFS_ROCKET">Rocket</option>
              </select>
            </div>

            {mode === 'exchange' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
                    Exchange variant SKU
                  </label>
                  <input
                    value={exchangeVariantId}
                    onChange={(e) => setExchangeVariantId(e.target.value)}
                    placeholder="SKU to hand over"
                    className="w-full h-10 px-3 rounded border border-border bg-white text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={exchangeQty}
                    onChange={(e) => setExchangeQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full h-10 px-3 rounded border border-border bg-white text-sm tabular-nums"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => void submit()}
              className="w-full h-10 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              {mode === 'return' ? 'Process return' : 'Process exchange'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}