'use client';

import Link from 'next/link';
import styles from './HeroProductRow.module.css';

export interface HeroProductHero {
  badgeEn?: string;
  badgeBn?: string;
  titleEn: string;
  titleBn: string;
  subtitleEn?: string;
  subtitleBn?: string;
  ctaLabelEn: string;
  ctaLabelBn: string;
  ctaHref: string;
  bgColor: string;
  imageUrl?: string;
}

export interface HeroProductCard {
  titleEn: string;
  titleBn: string;
  imageUrl: string;
  href: string;
  ctaLabelEn?: string;
  ctaLabelBn?: string;
  ctaHref?: string;
}

export interface HeroProductRowConfig {
  hero: HeroProductHero;
  products: HeroProductCard[];
}

export interface HeroProductRowProps {
  config: HeroProductRowConfig;
  locale: 'bn' | 'en';
}

export function HeroProductRow({ config, locale }: HeroProductRowProps) {
  const bn = locale === 'bn';
  const { hero, products } = config;
  if (!hero || !products || products.length === 0) return null;

  const heroBadge = bn ? (hero.badgeBn ?? '') : (hero.badgeEn ?? '');
  const heroTitle = bn ? hero.titleBn : hero.titleEn;
  const heroSubtitle = bn ? (hero.subtitleBn ?? '') : (hero.subtitleEn ?? '');
  const heroCta = bn ? hero.ctaLabelBn : hero.ctaLabelEn;

  return (
    <section className={styles.wrap} aria-label={heroTitle}>
      <div className={styles.grid}>
        {/* Left: large hero card */}
        <div className={styles.hero} style={{ backgroundColor: hero.bgColor }}>
          {hero.imageUrl ? (
            <div className={styles.heroBgImg} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero.imageUrl} alt="" loading="lazy" />
            </div>
          ) : null}
          <div className={styles.heroContent}>
            {heroBadge ? <span className={styles.heroBadge}>{heroBadge}</span> : null}
            <h2 className={styles.heroTitle}>{heroTitle}</h2>
            {heroSubtitle ? <p className={styles.heroSubtitle}>{heroSubtitle}</p> : null}
            <Link href={hero.ctaHref} className={styles.heroCta}>{heroCta}</Link>
          </div>
        </div>

        {/* Right: 4 product cards */}
        <div className={styles.products}>
          {products.slice(0, 4).map((card, i) => {
            const title = bn ? card.titleBn : card.titleEn;
            const cta = bn ? (card.ctaLabelBn ?? '') : (card.ctaLabelEn ?? '');
            const ctaHref = card.ctaHref || card.href;
            return (
              <div key={`card-${i}`} className={styles.card}>
                <Link href={card.href} className={styles.cardImgWrap} aria-label={title}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={card.imageUrl} alt={title} loading="lazy" />
                </Link>
                <Link href={card.href} className={styles.cardTitle}>{title}</Link>
                {cta ? (
                  <Link href={ctaHref} className={styles.cardCta}>{cta}</Link>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}