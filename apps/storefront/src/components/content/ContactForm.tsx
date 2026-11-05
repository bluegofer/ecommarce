'use client';

import { useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import styles from './ContactForm.module.css';

export interface ContactFormLabels {
  name: string;
  email: string;
  orderNo: string;
  subject: string;
  subjectGeneral: string;
  subjectOrder: string;
  subjectReturn: string;
  subjectOther: string;
  message: string;
  submit: string;
  submitting: string;
  successToast: string;
  errorText: string;
  hotlineTitle: string;
  hotlineBody: string;
  emailTitle: string;
  emailBody: string;
  whatsappTitle: string;
  whatsappBody: string;
}

export interface ContactFormProps {
  labels: ContactFormLabels;
}

interface SubmitResponse {
  ok: boolean;
  ticketId?: string;
}

export function ContactForm({ labels }: ContactFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [subject, setSubject] = useState('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError(labels.errorText);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post<SubmitResponse>('/cms/contact', {
        name: name.trim(),
        email: email.trim(),
        orderNumber: orderNo.trim() || undefined,
        subject,
        message: message.trim(),
      });
      setSuccess(true);
      setName('');
      setEmail('');
      setOrderNo('');
      setMessage('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError(labels.errorText);
      } else {
        setError(labels.errorText);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.grid}>
      {/* Left: contact info */}
      <aside className={styles.info}>
        <div className={styles.infoCard}>
          <span className={styles.infoIcon} aria-hidden="true">📞</span>
          <h3 className={styles.infoTitle}>{labels.hotlineTitle}</h3>
          <p className={styles.infoBody}>{labels.hotlineBody}</p>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoIcon} aria-hidden="true">✉️</span>
          <h3 className={styles.infoTitle}>{labels.emailTitle}</h3>
          <p className={styles.infoBody}>{labels.emailBody}</p>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoIcon} aria-hidden="true">💬</span>
          <h3 className={styles.infoTitle}>{labels.whatsappTitle}</h3>
          <p className={styles.infoBody}>{labels.whatsappBody}</p>
        </div>
      </aside>

      {/* Right: form */}
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {success ? (
          <div className={styles.successToast} role="status" aria-live="polite">
            {labels.successToast}
          </div>
        ) : null}
        {error ? (
          <div className={styles.formError} role="alert">{error}</div>
        ) : null}

        <label className={styles.field}>
          <span className={styles.label}>{labels.name} <span aria-hidden="true">*</span></span>
          <input
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{labels.email} <span aria-hidden="true">*</span></span>
          <input
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{labels.orderNo}</span>
          <input
            type="text"
            className={styles.input}
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            placeholder="BG-XXXX-XXXX"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{labels.subject}</span>
          <select
            className={styles.input}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="general">{labels.subjectGeneral}</option>
            <option value="order">{labels.subjectOrder}</option>
            <option value="return">{labels.subjectReturn}</option>
            <option value="other">{labels.subjectOther}</option>
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{labels.message} <span aria-hidden="true">*</span></span>
          <textarea
            className={styles.textarea}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            required
          />
        </label>

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? labels.submitting : labels.submit}
        </button>
      </form>
    </div>
  );
}