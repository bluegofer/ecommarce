'use client';

import { useState } from 'react';
import { formatPoisha } from '@/lib/format/money';
import type { CartItem } from '@/lib/cart/context';
import styles from './AddressStep.module.css';

export interface CheckoutAddress {
  recipientName: string;
  phone: string;
  contactPhone: string; // usually same as phone; kept separate for API
  contactEmail: string;
  city: string;
  area: string;
  line1: string;
  postcode: string;
}

export interface AddressStepProps {
  value: CheckoutAddress;
  onChange: (next: CheckoutAddress) => void;
  onContinue: () => void;
  items: CartItem[];
  subtotalPoisha: number;
  deliveryFeePoisha: number;
  discountPoisha: number;
  locale: 'bn' | 'en';
  labels: {
    title: string;
    recipientName: string;
    phone: string;
    email: string;
    city: string;
    cityPlaceholder: string;
    area: string;
    areaPlaceholder: string;
    line1: string;
    line1Placeholder: string;
    postcode: string;
    continue: string;
    summaryTitle: string;
    subtotal: string;
    delivery: string;
    discount: string;
    total: string;
    required: string;
    invalidPhone: string;
    invalidEmail: string;
    cityOptions: { value: string; label: string }[];
  };
}

export function AddressStep({
  value,
  onChange,
  onContinue,
  items,
  subtotalPoisha,
  deliveryFeePoisha,
  discountPoisha,
  locale,
  labels,
}: AddressStepProps) {
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutAddress, string>>>({});

  const update = (key: keyof CheckoutAddress, v: string) => {
    const next = { ...value, [key]: v };
    // Sync contactPhone with phone unless user typed something different
    if (key === 'phone') {
      next.contactPhone = v;
    }
    onChange(next);
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<keyof CheckoutAddress, string>> = {};
    if (!value.recipientName.trim()) e.recipientName = labels.required;
    if (!value.phone.trim()) e.phone = labels.required;
    else if (!/^\+?8801[3-9]\d{8}$/.test(value.phone.replace(/[\s-]/g, '')))
      e.phone = labels.invalidPhone;
    if (value.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.contactEmail))
      e.contactEmail = labels.invalidEmail;
    if (!value.city) e.city = labels.required;
    if (!value.area.trim()) e.area = labels.required;
    if (!value.line1.trim()) e.line1 = labels.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (validate()) onContinue();
  };

  const total = Math.max(0, subtotalPoisha + deliveryFeePoisha - discountPoisha);

  return (
    <div className={styles.layout}>
      <div className={styles.formCol}>
        <h2 className={styles.sectionTitle}>{labels.title}</h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="ck-name">
            {labels.recipientName} <span aria-hidden="true">*</span>
          </label>
          <input
            id="ck-name"
            type="text"
            className={[styles.input, errors.recipientName ? styles.inputError : ''].filter(Boolean).join(' ')}
            value={value.recipientName}
            onChange={(e) => update('recipientName', e.target.value)}
            autoComplete="name"
            aria-invalid={Boolean(errors.recipientName)}
          />
          {errors.recipientName ? <span className={styles.error}>{errors.recipientName}</span> : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="ck-phone">
            {labels.phone} <span aria-hidden="true">*</span>
          </label>
          <input
            id="ck-phone"
            type="tel"
            className={[styles.input, errors.phone ? styles.inputError : ''].filter(Boolean).join(' ')}
            value={value.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="+8801XXXXXXXXX"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone ? <span className={styles.error}>{errors.phone}</span> : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="ck-email">{labels.email}</label>
          <input
            id="ck-email"
            type="email"
            className={[styles.input, errors.contactEmail ? styles.inputError : ''].filter(Boolean).join(' ')}
            value={value.contactEmail}
            onChange={(e) => update('contactEmail', e.target.value)}
            autoComplete="email"
            aria-invalid={Boolean(errors.contactEmail)}
          />
          {errors.contactEmail ? <span className={styles.error}>{errors.contactEmail}</span> : null}
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="ck-city">
              {labels.city} <span aria-hidden="true">*</span>
            </label>
            <select
              id="ck-city"
              className={[styles.input, errors.city ? styles.inputError : ''].filter(Boolean).join(' ')}
              value={value.city}
              onChange={(e) => update('city', e.target.value)}
              aria-invalid={Boolean(errors.city)}
            >
              <option value="">{labels.cityPlaceholder}</option>
              {labels.cityOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {errors.city ? <span className={styles.error}>{errors.city}</span> : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="ck-area">
              {labels.area} <span aria-hidden="true">*</span>
            </label>
            <input
              id="ck-area"
              type="text"
              className={[styles.input, errors.area ? styles.inputError : ''].filter(Boolean).join(' ')}
              value={value.area}
              onChange={(e) => update('area', e.target.value)}
              placeholder={labels.areaPlaceholder}
              aria-invalid={Boolean(errors.area)}
            />
            {errors.area ? <span className={styles.error}>{errors.area}</span> : null}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="ck-line1">
            {labels.line1} <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="ck-line1"
            className={[styles.input, styles.textarea, errors.line1 ? styles.inputError : ''].filter(Boolean).join(' ')}
            value={value.line1}
            onChange={(e) => update('line1', e.target.value)}
            placeholder={labels.line1Placeholder}
            rows={3}
            autoComplete="street-address"
            aria-invalid={Boolean(errors.line1)}
          />
          {errors.line1 ? <span className={styles.error}>{errors.line1}</span> : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="ck-postcode">{labels.postcode}</label>
          <input
            id="ck-postcode"
            type="text"
            className={styles.input}
            value={value.postcode}
            onChange={(e) => update('postcode', e.target.value)}
            autoComplete="postal-code"
            maxLength={6}
            style={{ maxWidth: 160 }}
          />
        </div>

        <button type="button" className={styles.continueBtn} onClick={handleContinue}>
          {labels.continue}
        </button>
      </div>

      <aside className={styles.summaryCol}>
        <div className={styles.summaryCard}>
          <h3 className={styles.summaryTitle}>{labels.summaryTitle}</h3>
          <ul className={styles.itemList}>
            {items.slice(0, 3).map((it) => (
              <li key={it.variantId} className={styles.itemRow}>
                {it.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.itemThumb} src={it.thumbnailUrl} alt="" width={48} height={48} />
                ) : (
                  <span className={styles.itemThumbEmpty} aria-hidden="true" />
                )}
                <span className={styles.itemTitle}>
                  <span className="sk-tabular">×{it.qty}</span> {it.title}
                </span>
              </li>
            ))}
          </ul>
          {items.length > 3 ? <div className={styles.moreItems}>+{items.length - 3} more</div> : null}

          <div className={styles.summaryRows}>
            <div className={styles.summaryRow}>
              <span>{labels.subtotal}</span>
              <span className="sk-tabular">{formatPoisha(subtotalPoisha)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>{labels.delivery}</span>
              <span className="sk-tabular">
                {deliveryFeePoisha === 0 ? (locale === 'bn' ? 'ফ্রি' : 'FREE') : formatPoisha(deliveryFeePoisha)}
              </span>
            </div>
            {discountPoisha > 0 ? (
              <div className={`${styles.summaryRow} ${styles.discount}`}>
                <span>{labels.discount}</span>
                <span className="sk-tabular">−{formatPoisha(discountPoisha)}</span>
              </div>
            ) : null}
            <div className={styles.totalRow}>
              <span>{labels.total}</span>
              <span className="sk-tabular">{formatPoisha(total)}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}