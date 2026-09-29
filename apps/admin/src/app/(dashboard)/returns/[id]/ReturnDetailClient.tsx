'use client';

import { api } from '@/lib/api';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Package, Truck, Check, DollarSign } from 'lucide-react';
import { PageHeader, StatusChip, useToast, Modal } from '@/components/ui';
import { useQuery, useMutation } from '@/lib/hooks';

interface ReturnHistory {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorUserId: string | null;
  note: string | null;
  createdAt: string;
}

interface ReturnDetail {
  id: string;
  orderId: string;
  customerId: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PICKED_UP' | 'RECEIVED' | 'RESOLVED';
  reason: string;
  reasonNote: string | null;
  photoUrls: string[] | null;
  itemIds: string[];
  refundAmountPoisha: number;
  refundedAt: string | null;
  restockedAt: string | null;
  rejectReason: string | null;
  trackingNumber: string | null;
  createdAt: string;
  updatedAt: string;
  history?: ReturnHistory[];
}

const STATUS_TONE: Record<ReturnDetail['status'], 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  REQUESTED: 'info',
  APPROVED: 'info',
  PICKED_UP: 'warning',
  RECEIVED: 'warning',
  RESOLVED: 'success',
  REJECTED: 'danger',
};

const REASON_LABEL: Record<string, string> = {
  DAMAGED: 'Item arrived damaged',
  WRONG_ITEM: 'Wrong item sent',
  NOT_AS_DESCRIBED: 'Not as described',
  CHANGED_MIND: 'Changed my mind',
  SIZE_ISSUE: 'Size issue',
  QUALITY_ISSUE: 'Quality issue',
  OTHER: 'Other',
};

const STEPS = ['REQUESTED', 'APPROVED', 'PICKED_UP', 'RECEIVED', 'RESOLVED'] as const;

export function ReturnDetailClient({ returnId }: { returnId: string }) {
  const toast = useToast();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [pickedUpModalOpen, setPickedUpModalOpen] = useState(false);
  const [trackingInput, setTrackingInput] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveAmount, setApproveAmount] = useState('');
  const [approveNote, setApproveNote] = useState('');
  const [approveMethod, setApproveMethod] = useState('');
  const [approveReference, setApproveReference] = useState('');

  const q = useQuery<ReturnDetail>(`/api/v1/returns/${returnId}`);


  if (q.loading && !q.data) {
    return <div className="p-10 text-center text-slate-400">Loading return…</div>;
  }
  if (q.error) {
    return <div className="p-10 text-center text-danger-700">{q.error.message}</div>;
  }
  if (!q.data) return null;

  const r = q.data;
  const currentIdx = STEPS.indexOf(r.status as typeof STEPS[number]);
  const isRejected = r.status === 'REJECTED';

  const handleApprove = async () => {
    const amount = parseInt(approveAmount, 10);
    if (!approveAmount || isNaN(amount) || amount <= 0) {
      toast.error('Enter valid refund amount (poisha)');
      return;
    }
    if (!approveMethod) {
      toast.error('Select refund method');
      return;
    }
    try {
      await api.post(`/api/v1/returns/${returnId}/approve`, {
        refundAmountPoisha: amount,
        refundMethod: approveMethod,
        refundReference: approveReference || undefined,
        note: approveNote || undefined,
      });
      toast.success('Return approved');
      setApproveModalOpen(false);
      setApproveAmount('');
      setApproveMethod('');
      setApproveReference('');
      setApproveNote('');
      void q.refetch();
    } catch {
      toast.error('Approve failed');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Reject reason required');
      return;
    }
    try {
      await api.post(`/api/v1/returns/${returnId}/reject`, {
        rejectReason, 
      });
      toast.success('Return rejected');
      setRejectModalOpen(false);
      setRejectReason('');
      void q.refetch();
    } catch {
      toast.error('Reject failed');
    }
  };

  const handlePickedUp = async () => {
    try {
      await api.post(`/api/v1/returns/${returnId}/picked-up`, {
        trackingNumber: trackingInput || undefined,
      });
      toast.success('Marked picked up');
      setPickedUpModalOpen(false);
      setTrackingInput('');
      void q.refetch();
    } catch {
      toast.error('Update failed');
    }
  };

  const handleReceived = async () => {
    try {
      await api.post(`/api/v1/returns/${returnId}/received`);
      toast.success('Marked received');
      void q.refetch();
    } catch {
      toast.error('Update failed');
    }
  };

  const handleResolve = async () => {
    try {
      await api.post(`/api/v1/returns/${returnId}/resolve`);
      toast.success('Return resolved');
      void q.refetch();
    } catch {
      toast.error('Resolve failed');
    }
  };

  return (
    <div className="space-y-5">
      <Link
        href="/returns"
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Returns
      </Link>

      <PageHeader
        title={`Return #${r.id.slice(-8)}`}
        subtitle={`Order ${r.orderId.slice(-8)} • Requested ${new Date(r.createdAt).toLocaleDateString()}`}
      />

      {/* Status banner */}
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusChip label={r.status.replace('_', ' ')} tone={STATUS_TONE[r.status]} />
          {isRejected && r.rejectReason ? (
            <span className="text-sm text-danger-700">Rejected: {r.rejectReason}</span>
          ) : null}
        </div>
        <span className="text-[12.5px] text-slate-500">
          Last updated {new Date(r.updatedAt).toLocaleString()}
        </span>
      </div>

      {/* Timeline */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Progress</h3>
        <ol className="flex items-center gap-1 overflow-x-auto">
          {STEPS.map((step, i) => {
            const done = currentIdx >= i;
            const isCurrent = step === r.status;
            return (
              <li key={step} className="flex items-center gap-1 flex-shrink-0">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[12.5px] font-medium ${
                    done
                      ? isCurrent
                        ? 'bg-sky-600 text-white'
                        : 'bg-sky-100 text-sky-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-current" />}
                  {step.replace('_', ' ')}
                </div>
                {i < STEPS.length - 1 ? (
                  <div className={`w-6 h-px ${currentIdx > i ? 'bg-sky-400' : 'bg-slate-200'}`} />
                ) : null}
              </li>
            );
          })}
          {isRejected ? (
            <>
              <div className="w-6 h-px bg-danger-300" />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12.5px] font-medium bg-danger-100 text-danger-700">
                <XCircle className="w-3.5 h-3.5" />
                REJECTED
              </div>
            </>
          ) : null}
        </ol>
      </div>

      {/* Reason */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Customer Request</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[12px] text-slate-500 uppercase tracking-wide mb-1">Reason</p>
            <p className="text-sm text-slate-800">{REASON_LABEL[r.reason] ?? r.reason}</p>
          </div>
          <div>
            <p className="text-[12px] text-slate-500 uppercase tracking-wide mb-1">Items</p>
            <p className="text-sm text-slate-800">{r.itemIds.length} item(s)</p>
          </div>
        </div>
        {r.reasonNote ? (
          <div className="mt-4">
            <p className="text-[12px] text-slate-500 uppercase tracking-wide mb-1">Customer Comment</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.reasonNote}</p>
          </div>
        ) : null}

        {r.photoUrls && r.photoUrls.length > 0 ? (
          <div className="mt-4">
            <p className="text-[12px] text-slate-500 uppercase tracking-wide mb-2">Photos</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {r.photoUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={url}
                    alt={`Return photo ${i + 1}`}
                    className="w-full aspect-square object-cover rounded-md border border-slate-200 hover:border-sky-400"
                  />
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Actions</h3>
        <div className="flex flex-wrap gap-2">
          {r.status === 'REQUESTED' ? (
            <>
              <button
                type="button"
                onClick={() => setApproveModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-success-600 text-white text-sm font-medium hover:bg-success-700"
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => setRejectModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-danger-600 text-white text-sm font-medium hover:bg-danger-700"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </>
          ) : null}

          {r.status === 'APPROVED' ? (
            <button
              type="button"
              onClick={() => setPickedUpModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              <Truck className="w-4 h-4" />
              Mark Picked Up
            </button>
          ) : null}

          {r.status === 'PICKED_UP' ? (
            <button
              type="button"
              onClick={handleReceived}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              <Package className="w-4 h-4" />
              Mark Received
            </button>
          ) : null}

          {r.status === 'RECEIVED' ? (
            <button
              type="button"
              onClick={handleResolve}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-success-600 text-white text-sm font-medium hover:bg-success-700"
            >
              <DollarSign className="w-4 h-4" />
              Resolve
            </button>
          ) : null}

          {r.status === 'RESOLVED' ? (
            <div className="text-sm text-slate-600">
              Resolved on {new Date(r.updatedAt).toLocaleString()}
              {r.refundedAt ? ` • Refunded ${(r.refundAmountPoisha / 100).toFixed(2)} BDT` : ''}
            </div>
          ) : null}

          {r.status === 'REJECTED' ? (
            <div className="text-sm text-danger-700">Rejected — no further actions</div>
          ) : null}
        </div>
      </div>

      {/* History log */}
      {r.history && r.history.length > 0 ? (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Audit Log</h3>
          <ul className="divide-y divide-slate-100">
            {r.history.map((h) => (
              <li key={h.id} className="py-2.5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12.5px] text-slate-800">
                    <span className="text-slate-500">{h.fromStatus ?? 'NEW'}</span>
                    {' → '}
                    <span className="font-medium">{h.toStatus}</span>
                  </p>
                  {h.note ? <p className="text-[12px] text-slate-500 mt-0.5">{h.note}</p> : null}
                </div>
                <span className="text-[12px] text-slate-400 flex-shrink-0">
                  {new Date(h.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Reject Modal */}
      <Modal open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Return">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">Reject Reason</label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. Not eligible — outside return window"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRejectModalOpen(false)}
              className="px-4 py-2 rounded-md border border-slate-300 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReject}
              className="px-4 py-2 rounded-md bg-danger-600 text-white text-sm font-medium"
            >
              Reject
            </button>
          </div>
        </div>
      </Modal>

      {/* Picked Up Modal */}
      <Modal open={pickedUpModalOpen} onClose={() => setPickedUpModalOpen(false)} title="Mark Picked Up">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">Tracking Number (optional)</label>
          <input
            type="text"
            value={trackingInput}
            onChange={(e) => setTrackingInput(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. PATHAO-123456"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPickedUpModalOpen(false)}
              className="px-4 py-2 rounded-md border border-slate-300 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePickedUp}
              className="px-4 py-2 rounded-md bg-sky-600 text-white text-sm font-medium"
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      {/* Approve Modal */}
      <Modal open={approveModalOpen} onClose={() => setApproveModalOpen(false)} title="Approve Return">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">Refund Amount (poisha)</label>
          <input
            type="number"
            value={approveAmount}
            onChange={(e) => setApproveAmount(e.target.value)}
            placeholder="e.g. 149000 for ৳1,490"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="block text-sm font-medium text-slate-700">Refund Method *</label>
          <select
            value={approveMethod}
            onChange={(e) => setApproveMethod(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">Select method...</option>
            <option value="BKASH">bKash</option>
            <option value="NAGAD">Nagad</option>
            <option value="ROCKET">Rocket</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="PROMO_CODE">Promo Code</option>
            <option value="STORE_CREDIT">Store Credit</option>
          </select>
          <label className="block text-sm font-medium text-slate-700">Reference (optional)</label>
          <input
            type="text"
            value={approveReference}
            onChange={(e) => setApproveReference(e.target.value)}
            placeholder="Transaction ID / Promo code..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="block text-sm font-medium text-slate-700">Note (optional)</label>
          <textarea
            value={approveNote}
            onChange={(e) => setApproveNote(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setApproveModalOpen(false)} className="px-4 py-2 rounded-md border border-slate-300 text-sm">Cancel</button>
            <button type="button" onClick={handleApprove} className="px-4 py-2 rounded-md bg-success-600 text-white text-sm font-medium">Approve</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
