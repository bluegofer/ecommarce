// apps/storefront/src/app/[locale]/account/returns/new/page.tsx
// M-2 — dedicated return request page.
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { ReturnRequestForm } from '@/components/account/ReturnRequestForm';
import styles from './page.module.css';

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  items: Array<{ id: string; sku: string; title: string; quantity: number }>;
}

export default function NewReturnPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const bn = params.locale === 'bn';
  const orderId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('order')
    : null;

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError(bn ? 'অর্ডার নির্বাচন করুন' : 'No order selected');
      return;
    }
    api.get<OrderRow>(`/api/v1/orders/${orderId}`)
      .then(setOrder)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => setLoading(false));
  }, [orderId, bn]);

  if (loading) return <div className={styles.center}>{bn ? 'লোড হচ্ছে…' : 'Loading…'}</div>;
  if (error || !order) {
    return (
      <div className={styles.center}>
        
        <p className={styles.err}>{error ?? (bn ? 'অর্ডার পাওয়া যায়নি' : 'Order not found')}</p>
        <Link href={`/${params.locale}/account/orders`} className={styles.back}>
          ← {bn ? 'অর্ডারে ফিরে যান' : 'Back to orders'}
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <Link href={`/${params.locale}/account/orders`} className={styles.breadcrumb}>
        ← {bn ? 'অর্ডারে ফিরে যান' : 'Back to orders'}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.h1}>{bn ? 'ফেরত অনুরোধ' : 'Return request'}</h1>
        <p className={styles.sub}>
          {bn ? 'অর্ডার' : 'Order'} <code className={styles.code}>{order.orderNumber}</code>
        </p>
      </header>

      <ReturnRequestForm
        order={order}
        locale={params.locale}
        onSuccess={(id) => router.push(`/${params.locale}/account/returns/${id}`)}
      />
    </div>
  );
}