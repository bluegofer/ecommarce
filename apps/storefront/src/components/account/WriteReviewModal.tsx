'use client';

import { useState } from 'react';
import { usePresignedUpload } from '@/lib/hooks/use-presigned-upload';
import styles from './WriteReviewModal.module.css';

interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  sku: string;
  title: string;
}

export interface WriteReviewModalProps {
  open: boolean;
  orderId: string;
  items: OrderItem[];
  locale: string;
  onClose: () => void;
  onSuccess: () => void;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? '#f5a623' : 'none'} stroke={filled ? '#f5a623' : '#cbd5e1'} strokeWidth="1.5" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function WriteReviewModal({ open, orderId, items, locale, onClose, onSuccess }: WriteReviewModalProps) {
  const bn = locale === 'bn';
  const { uploadBlob, progress } = usePresignedUpload();
  const [productId, setProductId] = useState(items[0]?.productId ?? '');
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

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
        if (!f || !f.type.startsWith('image/')) continue;
        if (f.size > 5 * 1024 * 1024) throw new Error(`${f.name} > 5 MB`);
        const url = await uploadBlob(f, f.type, f.name, `rev-${Date.now()}-${i}`);
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
    if (!productId || rating === 0 || !body.trim()) {
      setError(bn ? 'পণ্য, রেটিং এবং মন্তব্য আবশ্যক' : 'Product, rating and comment are required');
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: Record<string, unknown> = {
      productId,
      orderId,
      rating,
      body: body.trim(),
    };
    if (title.trim()) payload.title = title.trim();
    if (photoUrls.length > 0) payload.photoUrls = photoUrls;

    try {
      const res = await fetch(`/api/v1/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Error ${res.status}`);
      }
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className={styles.header}>
          <h2 className={styles.h2}>{bn ? 'রিভিউ লিখুন' : 'Write a review'}</h2>
          <button type="button" onClick={onClose} className={styles.close} aria-label="Close">
            <XIcon />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.label}>{bn ? 'পণ্য' : 'Product'}</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className={styles.select}>
              {items.map((it) => (
                <option key={it.id} value={it.productId}>{it.title}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{bn ? 'রেটিং' : 'Rating'}</label>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={styles.starBtn}
                  aria-label={`${n} stars`}
                >
                  <StarIcon filled={n <= rating} />
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{bn ? 'শিরোনাম (ঐচ্ছিক)' : 'Title (optional)'}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.input}
              placeholder={bn ? 'সংক্ষিপ্ত শিরোনাম' : 'Brief title'}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{bn ? 'মন্তব্য *' : 'Comment *'}</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className={styles.textarea}
              placeholder={bn ? 'পণ্য সম্পর্কে আপনার মতামত…' : 'Your opinion on this product…'}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{bn ? 'ছবি (সর্বোচ্চ ৫টি)' : 'Photos (max 5)'}</label>
            <div className={styles.photos}>
              {photoUrls.map((url, i) => (
                <div key={url} className={styles.thumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className={styles.thumbImg} />
                  <button
                    type="button"
                    onClick={() => setPhotoUrls((p) => p.filter((_, idx) => idx !== i))}
                    className={styles.removeBtn}
                  >
                    <XIcon />
                  </button>
                </div>
              ))}
              {photoUrls.length < 5 && (
                <label className={styles.uploadBtn}>
                  {uploading ? '...' : '+'}
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
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <footer className={styles.footer}>
          <button type="button" onClick={onClose} className={styles.cancel}>
            {bn ? 'বাতিল' : 'Cancel'}
          </button>
          <button type="button" onClick={() => void submit()} disabled={submitting || uploading} className={styles.submit}>
            {submitting ? (bn ? 'পাঠানো হচ্ছে…' : 'Submitting…') : (bn ? 'রিভিউ পাঠান' : 'Submit review')}
          </button>
        </footer>
      </div>
    </div>
  );
}