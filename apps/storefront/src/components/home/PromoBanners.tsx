import Link from 'next/link';
import styles from './PromoBanners.module.css';

export interface PromoBanner {
  imageUrl: string;
  titleEn: string;
  titleBn: string;
  ctaHref: string;
  ctaLabelEn: string;
  ctaLabelBn: string;
}

export interface PromoBannersProps {
  banners: PromoBanner[]; // up to 4 (2x2 grid)
  locale: 'bn' | 'en';
}

export function PromoBanners({ banners, locale }: PromoBannersProps) {
  const shown = banners.slice(0, 4);
  if (shown.length === 0) return null;

  return (
    <section className={styles.grid} aria-label={locale === 'bn' ? 'প্রচার' : 'Promotions'}>
      {shown.map((b, i) => (
        <Link key={i} href={b.ctaHref} className={styles.tile}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.image} src={b.imageUrl} alt={locale === 'bn' ? b.titleBn : b.titleEn} width={800} height={400} />
          <div className={styles.overlay}>
            <h3 className={styles.title}>{locale === 'bn' ? b.titleBn : b.titleEn}</h3>
            <span className={styles.cta}>{locale === 'bn' ? b.ctaLabelBn : b.ctaLabelEn}</span>
          </div>
        </Link>
      ))}
    </section>
  );
}