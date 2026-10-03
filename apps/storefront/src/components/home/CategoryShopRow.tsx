'use client';

import Link from 'next/link';
import styles from './CategoryShopRow.module.css';

export interface ShopRowItem {
  labelEn: string;
  labelBn: string;
  imageUrl: string;
  href: string;
}

export interface ShopRowTile {
  titleEn: string;
  titleBn: string;
  subtitleEn?: string;
  subtitleBn?: string;
  seeAllHref: string;
  items: ShopRowItem[];
}

export interface CategoryShopRowConfig {
  bgTheme?: 'default' | 'red' | 'orange' | 'green';
  tiles: ShopRowTile[];
}

export interface CategoryShopRowProps {
  config: CategoryShopRowConfig;
  locale: 'bn' | 'en';
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="16" height="16">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function CategoryShopRow({ config, locale }: CategoryShopRowProps) {
  const bn = locale === 'bn';
  const tiles = config.tiles ?? [];
  if (tiles.length === 0) return null;

  const themeClass = config.bgTheme && config.bgTheme !== 'default'
    ? styles['theme' + config.bgTheme.charAt(0).toUpperCase() + config.bgTheme.slice(1)]
    : '';

  return (
    <section className={`${styles.wrap} ${themeClass}`} aria-label={bn ? 'ক্যাটাগরি শপিং' : 'Shop by category'}>
      <div className={styles.row}>
        {tiles.map((tile, i) => {
          const title = bn ? tile.titleBn : tile.titleEn;
          const subtitle = bn ? (tile.subtitleBn ?? '') : (tile.subtitleEn ?? '');
          return (
            <div key={`tile-${i}`} className={styles.tile}>
              <div className={styles.tileHead}>
                <div>
                  <h3 className={styles.title}>{title}</h3>
                  {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
                </div>
                {tile.seeAllHref ? (
                  <Link href={tile.seeAllHref} className={styles.seeAll} aria-label={bn ? 'সব দেখুন' : 'See all'}>
                    <ArrowRight />
                  </Link>
                ) : null}
              </div>
              <div className={styles.grid}>
                {(tile.items ?? []).slice(0, 4).map((item, j) => {
                  const label = bn ? item.labelBn : item.labelEn;
                  return (
                    <Link key={`item-${i}-${j}`} href={item.href} className={styles.item}>
                      <span className={styles.itemImg}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.imageUrl} alt={label} loading="lazy" />
                      </span>
                      <span className={styles.itemLabel}>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}