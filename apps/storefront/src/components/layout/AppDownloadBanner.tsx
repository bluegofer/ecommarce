// apps/storefront/src/components/layout/AppDownloadBanner.tsx
'use client';

import styles from './AppDownloadBanner.module.css';

interface Props {
  locale: 'bn' | 'en';
}

export function AppDownloadBanner({ locale }: Props) {
  const bn = locale === 'bn';
  const t = (en: string, bnText: string) => (bn ? bnText : en);

  return (
    <section className={styles.banner} aria-label={t('Mobile apps coming soon', 'মোবাইল অ্যাপ আসছে')}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <div className={styles.iconWrap} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
              <rect x="6" y="2" width="12" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
          <div>
            <h3 className={styles.heading}>{t('Mobile apps coming soon', 'মোবাইল অ্যাপ আসছে')}</h3>
            <p className={styles.sub}>{t('Shop faster on Android and iPhone — get exclusive app-only offers.', 'অ্যান্ড্রয়েড এবং আইফোনে দ্রুত কিনুন — শুধু অ্যাপের জন্য বিশেষ অফার।')}</p>
          </div>
        </div>
        <div className={styles.stores}>
          <span className={styles.storeBadge} aria-disabled="true">
            <span className={styles.storeIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor" className={styles.storeSvg}>
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zM14.5 12.707l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198L20.36 10.86a1 1 0 0 1 0 1.68l-2.661 1.35L15.207 12l2.492-2.491zm-.897-.897L6.866 2.28l10.937 6.333-2.302 2.302z"/>
              </svg>
            </span>
            <span className={styles.storeText}>
              <span className={styles.storeSmall}>{t('Coming soon', 'শীঘ্রই')}</span>
              <span className={styles.storeBig}>Google Play</span>
            </span>
          </span>
          <span className={styles.storeBadge} aria-disabled="true">
            <span className={styles.storeIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor" className={styles.storeSvg}>
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12 7.19c-.15-2.27 1.66-4.19 3.79-4.37.29 2.5-2.06 4.68-3.79 4.37z"/>
              </svg>
            </span>
            <span className={styles.storeText}>
              <span className={styles.storeSmall}>{t('Coming soon', 'শীঘ্রই')}</span>
              <span className={styles.storeBig}>App Store</span>
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}