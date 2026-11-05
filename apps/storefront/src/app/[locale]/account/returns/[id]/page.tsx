// apps/storefront/src/app/[locale]/account/returns/[id]/page.tsx
// M-4 — return status tracking.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { returnsApi, type ReturnRequestDetail } from '@/lib/api/returns';
import { useAuth } from '@/lib/auth/context';
import { ReturnTimeline } from '@/components/account/ReturnTimeline';
import styles from './page.module.css';

export default function ReturnDetailPage({ params }: { params: { locale: string; id: string } }) {
  const bn = params.locale === 'bn';
  const [data, setData] = useState<ReturnRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // step-164: wait for AuthProvider session restore before fetching.
  const { signedIn, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;             // auth still restoring — wait
    if (!signedIn) {
      setError(bn ? 'সাইন ইন প্রয়োজন' : 'Authentication required');
      setLoading(false);
      return;
    }
    returnsApi.detail(params.id)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => setLoading(false));
  }, [params.id, authLoading, signedIn, bn]);

  if (loading) return <div className={styles.center}>{bn ? 'লোড হচ্ছে…' : 'Loading…'}</div>;
  if (error || !data) {
    return (
      <div className={styles.center}>
        <p className={styles.err}>{error ?? (bn ? 'অনুরোধ পাওয়া যায়নি' : 'Return not found')}</p>
        <Link href={`/${params.locale}/account/returns`} className={styles.back}>
          ← {bn ? 'ফিরে যান' : 'Back'}
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <Link href={`/${params.locale}/account/returns`} className={styles.breadcrumb}>
        ← {bn ? 'সব ফেরত' : 'All returns'}
      </Link>

      <header className={styles.header}>
        <div className={styles.iconWrap}>
          ✓
        </div>
        <div>
          <h1 className={styles.h1}>{bn ? 'ফেরত অনুরোধ' : 'Return request'}</h1>
          <p className={styles.sub}>
            {bn ? 'অর্ডার' : 'Order'} <code className={styles.code}>{data.orderNumber}</code>
          </p>
        </div>
      </header>

      <section className={styles.card}>
        <h3 className={styles.h3}>{bn ? 'স্টেটাস' : 'Status'}</h3>
        <ReturnTimeline events={data.timeline ?? []} locale={params.locale} />
      </section>

      <section className={styles.card}>
        <h3 className={styles.h3}>{bn ? 'পণ্য' : 'Items'}</h3>
        <ul className={styles.itemList}>
          {(data.items ?? []).map((it) => (
            <li key={it.id} className={styles.item}>
              <span>{it.title}</span>
              <code className={styles.sku}>{it.sku || '—'}</code>
              <span className={styles.qty}>× {it.quantity}</span>
            </li>
          ))}
        </ul>
      </section>

      {data.photoUrls && data.photoUrls.length > 0 && (
        <section className={styles.card}>
          <h3 className={styles.h3}>{bn ? 'সংযুক্ত ছবি' : 'Attached photos'}</h3>
          <div className={styles.photos}>
            {data.photoUrls.map((u) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt="" className={styles.photo} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
