'use client';

import { useEffect, useState } from 'react';
import {
  accountApi,
  ApiError,
  type MeAddress,
  type UpsertAddressInput,
} from '@/lib/api';
import styles from './AddressBook.module.css';

export interface AddressBookLabels {
  title: string;
  addNew: string;
  edit: string;
  remove: string;
  setDefault: string;
  defaultBadge: string;
  save: string;
  cancel: string;
  confirmDelete: string;
  emptyTitle: string;
  emptyBody: string;
  loading: string;
  errorText: string;
  form: {
    label: string;
    recipientName: string;
    phone: string;
    area: string;
    city: string;
    postcode: string;
    line1: string;
    line2: string;
    isDefault: string;
  };
}

export interface AddressBookProps {
  locale: 'bn' | 'en';
  labels: AddressBookLabels;
}

const EMPTY_FORM: UpsertAddressInput = {
  label: '',
  recipientName: '',
  phone: '',
  area: '',
  city: 'Dhaka',
  postcode: '',
  line1: '',
  line2: '',
  isDefault: false,
};

export function AddressBook({ locale, labels }: AddressBookProps) {
  const [items, setItems] = useState<MeAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MeAddress | 'new' | null>(null);
  const [form, setForm] = useState<UpsertAddressInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await accountApi.listAddresses();
      setItems(res);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) {
        setError(labels.errorText);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const openNew = () => {
    setEditing('new');
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const openEdit = (a: MeAddress) => {
    setEditing(a);
    setForm({
      label: a.label ?? '',
      recipientName: a.recipientName,
      phone: a.phone,
      area: a.area,
      city: a.city,
      postcode: a.postcode ?? '',
      line1: a.line1,
      line2: a.line2 ?? '',
      isDefault: a.isDefault,
    });
    setFormError(null);
  };

  const close = () => { setEditing(null); setFormError(null); };

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    setFormError(null);
    try {
      if (editing === 'new') {
        await accountApi.createAddress(form);
      } else if (editing) {
        await accountApi.updateAddress(editing.id, form);
      }
      await load();
      close();
    } catch (err) {
      setFormError(
        err instanceof ApiError && err.status === 400
          ? labels.errorText
          : labels.errorText,
      );
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm(labels.confirmDelete)) return;
    try {
      await accountApi.deleteAddress(id);
      await load();
    } catch {
      /* noop */
    }
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h1 className={styles.h1}>{labels.title}</h1>
        <button type="button" className={styles.addBtn} onClick={openNew}>
          + {labels.addNew}
        </button>
      </header>

      {loading ? (
        <p className={styles.state}>{labels.loading}</p>
      ) : error ? (
        <p className={styles.state}>{error}</p>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>{labels.emptyTitle}</h2>
          <p className={styles.emptyBody}>{labels.emptyBody}</p>
          <button type="button" className={styles.addBtn} onClick={openNew}>
            + {labels.addNew}
          </button>
        </div>
      ) : (
        <ul className={styles.grid}>
          {items.map((a) => (
            <li key={a.id} className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.name}>{a.recipientName}</span>
                {a.isDefault ? <span className={styles.defaultBadge}>{labels.defaultBadge}</span> : null}
              </div>
              {a.label ? <span className={styles.label}>{a.label}</span> : null}
              <address className={styles.addr}>
                <span>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</span>
                <span>{a.area}, {a.city}{a.postcode ? ` — ${a.postcode}` : ''}</span>
                <span>📞 {a.phone}</span>
              </address>
              <div className={styles.actions}>
                <button type="button" className={styles.actionBtn} onClick={() => openEdit(a)}>
                  {labels.edit}
                </button>
                <button type="button" className={styles.actionDanger} onClick={() => onDelete(a.id)}>
                  {labels.remove}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <div className={styles.modalBg} onClick={close} role="presentation">
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2 className={styles.modalTitle}>
              {editing === 'new' ? labels.addNew : labels.edit}
            </h2>
            {formError ? <div className={styles.formError}>{formError}</div> : null}
            <div className={styles.form}>
              <Field label={labels.form.recipientName} value={form.recipientName} onChange={(v) => setForm({ ...form, recipientName: v })} required />
              <Field label={labels.form.phone} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required type="tel" />
              <Field label={labels.form.area} value={form.area} onChange={(v) => setForm({ ...form, area: v })} required />
              <Field label={labels.form.city} value={form.city} onChange={(v) => setForm({ ...form, city: v })} required />
              <Field label={labels.form.postcode} value={form.postcode ?? ''} onChange={(v) => setForm({ ...form, postcode: v })} />
              <Field label={labels.form.line1} value={form.line1} onChange={(v) => setForm({ ...form, line1: v })} required />
              <Field label={labels.form.line2} value={form.line2 ?? ''} onChange={(v) => setForm({ ...form, line2: v })} />
              <Field label={labels.form.label} value={form.label ?? ''} onChange={(v) => setForm({ ...form, label: v })} />
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={Boolean(form.isDefault)}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                />
                <span>{labels.form.isDefault}</span>
              </label>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelBtn} onClick={close} disabled={saving}>
                {labels.cancel}
              </button>
              <button type="button" className={styles.saveBtn} onClick={onSave} disabled={saving}>
                {saving ? '…' : labels.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>
        {label}{required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <input
        type={type}
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </label>
  );
}