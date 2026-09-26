'use client';

import { useState } from 'react';
import { usePresignedUpload } from '@/lib/hooks/use-presigned-upload';
import { returnsApi, type CreateReturnPayload } from '@/lib/api/returns';
import styles from './ReturnRequestForm.module.css';

interface OrderOption {
  id: string;
  orderNumber: string;
  items: Array<{ id: string; sku: string; title: string; quantity: number }>;
}

export interface ReturnRequestFormProps {
  order: OrderOption;
  locale: string;
  onSuccess: (returnId: string) => void;
}

const REASONS = [
  { value: 'DAMAGED', en: 'Item arrived damaged', bn: 'পণ্য ক্ষতিগ্রস্ত' },
  { value: 'WRONG_ITEM', en: 'Wrong item sent', bn: 'ভুল পণ্য পাঠানো হয়েছে' },
  { value: 'NOT_AS_DESCRIBED', en: 'Not as described', bn: 'বর্ণনার সাথে মিল নেই' },
  { value: 'CHANGED_MIND', en: 'Changed my mind', bn: 'মন পরিবর্তন করেছি' },
  { value: 'OTHER', en: 'Other', bn: 'অন্যান্য' },
];

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export function ReturnRequestForm({ order, locale, onSuccess }: ReturnRequestFormProps) {
  const bn = locale === 'bn';
  const { uploadBlob, progress } = usePresignedUpload();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('DAMAGED');
  const [reasonNote, setReasonNote] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    const next = new Set(selectedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItems(next);
  };

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (photoUrls.length + files.length > 5) {
      setError(bn ? 'সর্বোচ্চ ৫টি ছবি' : 'Max 5 photos');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (!f) continue;
        if (!f.type.startsWith('image/')) continue;
        if (f.size > 5 * 1024 * 1024) {
          throw new Error(bn ? `${f.name} ৫MB এর বেশি` : `${f.name} exceeds 5 MB`);
        }
        const url = await uploadBlob(f, f.type, f.name, `ret-${Date.now()}-${i}`);
        urls.push(url);
      }
      setPhotoUrls((prev) => [...prev, ...urls]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (selectedItems.size === 0) {
      setError(bn ? 'অন্তত একটি পণ্য নির্বাচন করুন' : 'Select at least one item');
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: CreateReturnPayload = {
      orderId: order.id,
      itemIds: Array.from(selectedItems),
      reason,
    };
    if (reasonNote.trim()) payload.reasonNote = reasonNote.trim();
    if (photoUrls.length > 0) payload.photoUrls = photoUrls;

    try {
      const created = await returnsApi.create(payload);
      onSuccess(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.form}>
      <section className={styles.section}>
        <h3 className={styles.h3}>{bn ? 'কোন পণ্য ফেরত দিতে চান?' : 'Which items to return?'}</h3>
        <div className={styles.items}>
          {order.items.map((it) => {
            const checked = selectedItems.has(it.id);
            return (
              <label key={it.id} className={`${styles.item} ${checked ? styles.itemChecked : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleItem(it.id)}
                  className={styles.checkbox}
                />
                <div>
                  <div className={styles.itemTitle}>{it.title}</div>
                  <code className={styles.sku}>{it.sku}</code>
                </div>
                <span className={styles.qty}>× {it.quantity}</span>
              </label>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.h3}>{bn ? 'কারণ' : 'Reason'}</h3>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className={styles.select}>
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>{bn ? r.bn : r.en}</option>
          ))}
        </select>
        <textarea
          value={reasonNote}
          onChange={(e) => setReasonNote(e.target.value)}
          rows={3}
          placeholder={bn ? 'বিস্তারিত লিখুন (ঐচ্ছিক)' : 'Details (optional)'}
          className={styles.textarea}
        />
      </section>

      <section className={styles.section}>
        <h3 className={styles.h3}>{bn ? 'ছবি সংযুক্ত করুন (সর্বোচ্চ ৫টি)' : 'Attach photos (max 5)'}</h3>
        <div className={styles.uploadGrid}>
          {photoUrls.map((url, i) => (
            <div key={url} className={styles.thumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className={styles.thumbImg} />
              <button
                type="button"
                onClick={() => setPhotoUrls((prev) => prev.filter((_, idx) => idx !== i))}
                className={styles.remove}
                aria-label="Remove"
              >
                <XIcon className={styles.iconSmall} />
              </button>
            </div>
          ))}
          {photoUrls.length < 5 && (
            <label className={styles.upload}>
              {uploading ? (
                <SpinnerIcon className={styles.iconSpin} />
              ) : (
                <UploadIcon className={styles.iconMed} />
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                className={styles.fileInput}
                onChange={(e) => void handleFiles(e.target.files)}
              />
            </label>
          )}
        </div>
        {Object.values(progress).some((p) => p < 100) && (
          <div className={styles.progressBar}>
            {Object.values(progress).map((p, i) => (
              <div key={i} className={styles.progressFill} style={{ width: `${p}%` }} />
            ))}
          </div>
        )}
      </section>

      {error && <div className={styles.error}>{error}</div>}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={submitting || uploading || selectedItems.size === 0}
        className={styles.submit}
      >
        {submitting && <SpinnerIcon className={styles.iconSmall} />}
        {submitting
          ? (bn ? 'পাঠানো হচ্ছে…' : 'Submitting…')
          : (bn ? 'ফেরত অনুরোধ পাঠান' : 'Submit return request')}
      </button>
    </div>
  );
}