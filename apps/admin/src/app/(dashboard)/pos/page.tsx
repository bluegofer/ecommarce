'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ScanLine, Trash2, Banknote, CreditCard, Smartphone, Wallet, Receipt } from 'lucide-react';
import { PageHeader, StatusChip, useToast, Modal } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';
import { formatPoisha } from '@/lib/utils';

interface Variant {
  id: string;
  sku: string;
  barcode: string | null;
  pricePoisha: number;
  stock: number;
  title: string;
}

interface CartLine {
  variantId: string;
  sku: string;
  title: string;
  unitPrice: number;
  quantity: number;
}

interface Branch {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
}

type PayMethod = 'CASH' | 'CARD' | 'MFS_BKASH' | 'MFS_NAGAD' | 'MFS_ROCKET';

export default function PosRegisterPage() {
  const toast = useToast();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [payOpen, setPayOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>('CASH');
  const [paidAmount, setPaidAmount] = useState(0);
  const [branchId, setBranchId] = useState('');

  const { data: branches } = useQuery<Branch[]>('/api/v1/pos/branches');
  const effectiveBranch = branchId || branches?.find((b) => b.isDefault)?.id || branches?.[0]?.id || '';

  const { data: session } = useQuery<{ id: string; status: string } | null>(
    effectiveBranch ? `/api/v1/pos/sessions/active?branchId=${effectiveBranch}` : null,
  );

  const searchMutation = useMutation<{ q: string }, Variant>(
    'get' as never,
    (input) => `/api/v1/variants/lookup?q=${encodeURIComponent((input as { q: string }).q)}`,
  );

  const saleMutation = useMutation<{
    registerId: string;
    items: Array<{ variantId: string; quantity: number; unitPrice: number; discount: number }>;
    payments: Array<{ method: PayMethod; amount: number }>;
    discount: number;
  }, { id: string; receiptNumber: string }>('post', '/api/v1/pos/sales');

  const subtotal = useMemo(
    () => cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    [cart],
  );
  const total = Math.max(0, subtotal - discount);
  const change = Math.max(0, paidAmount - total);

  async function scanOrLookup() {
    if (!barcodeInput.trim()) return;
    try {
      const v = await searchMutation.mutate({ q: barcodeInput.trim() });
      const existing = cart.find((l) => l.variantId === v.id);
      if (existing) {
        setCart((c) =>
          c.map((l) => (l.variantId === v.id ? { ...l, quantity: l.quantity + 1 } : l)),
        );
      } else {
        setCart((c) => [
          ...c,
          {
            variantId: v.id,
            sku: v.sku,
            title: v.title,
            unitPrice: v.pricePoisha,
            quantity: 1,
          },
        ]);
      }
      setBarcodeInput('');
    } catch {
      toast.error('Not found', `No variant matches "${barcodeInput}"`);
    }
  }

  function updateQty(variantId: string, q: number) {
    setCart((c) =>
      c
        .map((l) => (l.variantId === variantId ? { ...l, quantity: Math.max(0, q) } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  async function completeSale() {
    if (!session?.id) {
      toast.error('No open session', 'Open a session first (Sessions tab).');
      return;
    }
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    try {
      const res = await saleMutation.mutate({
        registerId: session.id,
        items: cart.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: 0,
        })),
        payments: [{ method: payMethod, amount: paidAmount || total }],
        discount,
      });
      toast.success(`Sale complete — ${res.receiptNumber}`);
      setCart([]);
      setDiscount(0);
      setPaidAmount(0);
      setPayOpen(false);
    } catch (e) {
      toast.error('Sale failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="POS Register"
        subtitle="Barcode scan or quick lookup · multi-payment · receipt print on completion"
        actions={
          <>
            <Link
              href="/pos/sessions"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Sessions
            </Link>
            <Link
              href="/pos/returns"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Returns
            </Link>
            {session?.status === 'OPEN' ? (
              <StatusChip label="Session open" tone="success" />
            ) : (
              <StatusChip label="No session" tone="danger" />
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: scan + cart */}
        <div className="lg:col-span-2 space-y-3">
          <div className="card p-3">
            <div className="flex items-center gap-2">
              <select
                value={effectiveBranch}
                onChange={(e) => setBranchId(e.target.value)}
                className="h-10 px-2 rounded border border-border bg-white text-sm shrink-0"
              >
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  autoFocus
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void scanOrLookup();
                  }}
                  placeholder="Scan barcode or type SKU, then Enter…"
                  className="w-full h-10 pl-9 pr-3 rounded border border-border bg-white text-sm focus:border-sky-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            {cart.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <ScanLine className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                Scan or type a SKU to start
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-slate-500 uppercase">Item</th>
                    <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-slate-500 uppercase">Qty</th>
                    <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-slate-500 uppercase">Price</th>
                    <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-slate-500 uppercase">Total</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cart.map((l) => (
                    <tr key={l.variantId}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{l.title}</div>
                        <code className="text-[11.5px] text-slate-400 font-mono">{l.sku}</code>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateQty(l.variantId, l.quantity - 1)}
                            className="w-7 h-7 rounded border border-border hover:bg-slate-100"
                          >
                            −
                          </button>
                          <span className="w-8 text-center tabular-nums">{l.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(l.variantId, l.quantity + 1)}
                            className="w-7 h-7 rounded border border-border hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatPoisha(l.unitPrice)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-800">
                        {formatPoisha(l.unitPrice * l.quantity)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => updateQty(l.variantId, 0)}
                          className="p-1 rounded hover:bg-danger-50 text-danger-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: totals + pay */}
        <aside className="space-y-3">
          <div className="card p-5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="tabular-nums">{formatPoisha(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Discount</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-24 h-8 px-2 rounded border border-border bg-white text-sm tabular-nums text-right"
              />
            </div>
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="text-lg font-semibold tabular-nums text-slate-900">{formatPoisha(total)}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={cart.length === 0 || !session}
            onClick={() => {
              setPaidAmount(total);
              setPayOpen(true);
            }}
            className="w-full h-12 rounded bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:opacity-50"
          >
            Charge {formatPoisha(total)}
          </button>

          <button
            type="button"
            onClick={() => {
              setCart([]);
              setDiscount(0);
            }}
            disabled={cart.length === 0}
            className="w-full h-10 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Clear cart
          </button>
        </aside>
      </div>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Take payment"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setPayOpen(false)}
              className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void completeSale()}
              disabled={saleMutation.loading}
              className="h-9 px-3 rounded bg-success-600 text-white text-sm font-medium hover:bg-success-700 disabled:opacity-60"
            >
              {saleMutation.loading ? 'Processing…' : 'Complete sale'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {([
              { k: 'CASH', label: 'Cash', Icon: Banknote },
              { k: 'CARD', label: 'Card', Icon: CreditCard },
              { k: 'MFS_BKASH', label: 'bKash', Icon: Smartphone },
              { k: 'MFS_NAGAD', label: 'Nagad', Icon: Smartphone },
              { k: 'MFS_ROCKET', label: 'Rocket', Icon: Wallet },
            ] as const).map(({ k, label, Icon }) => (
              <button
                key={k}
                type="button"
                onClick={() => setPayMethod(k as PayMethod)}
                className={`h-16 rounded border flex flex-col items-center justify-center gap-1 transition-colors ${
                  payMethod === k
                    ? 'border-sky-600 bg-sky-50 text-sky-700'
                    : 'border-border bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[12.5px] font-medium">{label}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-slate-700 mb-1.5">
              Amount received
            </label>
            <input
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full h-10 px-3 rounded border border-border bg-white text-base tabular-nums text-right"
            />
          </div>

          <div className="p-3 rounded bg-slate-50 border border-border space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Total</span>
              <span className="tabular-nums">{formatPoisha(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Change</span>
              <span className="tabular-nums font-medium text-success-700">{formatPoisha(change)}</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}