'use client';

import Link from 'next/link';
import styles from './EidMegaSale.module.css';

export interface EidMegaSaleConfig {
  titleEn: string;
  titleBn: string;
  discountTextEn: string;
  discountTextBn: string;
  subtitleEn: string;
  subtitleBn: string;
  badgeEn?: string;
  badgeBn?: string;
  imageLeft: string;
  imageRight: string;
  ctaHref: string;
  ctaLabelEn: string;
  ctaLabelBn: string;
  bgTheme?: 'green' | 'gold';
}

export interface EidMegaSaleProps {
  config: EidMegaSaleConfig;
  locale: 'bn' | 'en';
}

function MoonStar() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={styles.moonSvg}>
      <path
        d="M32 12a14 14 0 1 0 0 24 12 12 0 1 1 0-24Z"
        fill="currentColor"
        opacity="0.85"
      />
      <circle cx="36" cy="16" r="2" fill="currentColor" />
      <circle cx="40" cy="22" r="1.5" fill="currentColor" />
    </svg>
  );
}

function Lantern() {
  return (
    <svg viewBox="0 0 24 40" fill="none" aria-hidden="true" className={styles.lanternSvg}>
      <path d="M12 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 4h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M5 8c0-1.5 1.5-2 3-2h8c1.5 0 3 .5 3 2v18c0 1.5-1.5 2-3 2H8c-1.5 0-3-.5-3-2V8Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M8 30h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10 32l2 3 2-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function EidMegaSale({ config, locale }: EidMegaSaleProps) {
  const bn = locale === 'bn';
  const title = bn ? config.titleBn : config.titleEn;
  const discount = bn ? config.discountTextBn : config.discountTextEn;
  const subtitle = bn ? config.subtitleBn : config.subtitleEn;
  const badge = bn ? (config.badgeBn ?? '') : (config.badgeEn ?? '');
  const ctaLabel = bn ? config.ctaLabelBn : config.ctaLabelEn;

  return (
    <section className={styles.wrap} aria-label={title}>
      <div className={styles.grid}>
        {/* Left tile — product collage + title overlay */}
        <div className={`${styles.tile} ${styles.left}`}>
          <div className={styles.overlay} aria-hidden="true" />
          <div className={styles.ornaments} aria-hidden="true">
            <span className={styles.ornMoon}><MoonStar /></span>
            <span className={styles.ornLantern1}><Lantern /></span>
            <span className={styles.ornLantern2}><Lantern /></span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={config.imageLeft} alt="" className={styles.image} loading="lazy" />
          <div className={styles.content}>
            {badge && <span className={styles.badge}>{badge}</span>}
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
        </div>

        {/* Right tile — discount call-out */}
        <div className={`${styles.tile} ${styles.right}`}>
          <div className={styles.rightBg} aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={config.imageRight} alt="" className={styles.imageRight} loading="lazy" />
          <div className={styles.rightContent}>
            <div className={styles.decoMoonRight} aria-hidden="true"><MoonStar /></div>
            <p className={styles.discount}>{discount}</p>
            <p className={styles.titleRight}>{title}</p>
            <Link href={config.ctaHref} className={styles.cta}>{ctaLabel}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}