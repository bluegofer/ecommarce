'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { PriceBlock } from '@/components/ui/PriceBlock';
import { RatingStars } from '@/components/ui/RatingStars';
import { Gallery } from './Gallery';
import { VariantPicker, type VariantOption } from './VariantPicker';
import { AddToCart } from './AddToCart';
import { StickyTabs } from './StickyTabs';
import { ReviewsBlock, type ReviewSummary, type ReviewItem } from './ReviewsBlock';
import { MobileBuyBar } from './MobileBuyBar';
import type { Dictionary } from '@/lib/i18n';
import styles from './PdpClient.module.css';

export interface PdpVariant {
  id: string;
  sku: string;
  pricePoisha: number;
  compareAtPoisha: number | null;
  stock: number;
  attributeValues: Record<string, string>;
}

export interface PdpImage {
  url: string;
  altText: string | null;
}

export interface PdpClientProps {
  productId: string;
  slug: string;
  title: string;
  brand: string | null;
  sellerName: string | null;
  images: PdpImage[];
  variants: PdpVariant[];
  bulletFeatures: string[];
  descriptionHtml: string;
  specs: { key: string; value: string }[];
  ratingAverage: number;
  ratingCount: number;
  deliveryTime?: string | null;
  videoUrl?: string | null;
  reviews: { summary: ReviewSummary; items: ReviewItem[] };
  isNew: boolean;
  bestSeller: boolean;
  locale: 'bn' | 'en';
  dict: Dictionary;
}

export function PdpClient(props: PdpClientProps) {
  const {
    productId, slug, title, brand, sellerName, images, variants,
    bulletFeatures, descriptionHtml, specs,
    ratingAverage, ratingCount, reviews, isNew, bestSeller,
    deliveryTime, videoUrl,
    locale, dict,
  } = props;

  // Derive variant option groups from variants' attributeValues
  const variantGroups = useMemo<VariantOption[]>(() => {
    const keys = new Set<string>();
    variants.forEach((v) => Object.keys(v.attributeValues).forEach((k) => keys.add(k)));

    return Array.from(keys).map((key) => {
      const values = new Set<string>();
      variants.forEach((v) => {
        const val = v.attributeValues[key];
        if (val) values.add(val);
      });
      return {
        key,
        label: attributeLabel(key, locale),
        values: Array.from(values).map((val) => ({
          value: val,
          label: attributeValueLabel(val, locale),
          available: variants.some(
            (v) => v.attributeValues[key] === val && v.stock > 0,
          ),
        })),
      };
    });
  }, [variants, locale]);

  // Initial selection: first in-stock variant's attributes (or first variant)
  const initialSelection = useMemo<Record<string, string>>(() => {
    const v = variants.find((x) => x.stock > 0) ?? variants[0];
    return v?.attributeValues ?? {};
  }, [variants]);

  const [selected, setSelected] = useState<Record<string, string>>(initialSelection);

  // Currently active variant: matches all selected attributes
  const activeVariant = useMemo(() => {
    const keys = Object.keys(selected);
    if (keys.length === 0) return variants[0] ?? null;
    return (
      variants.find((v) =>
        keys.every((k) => v.attributeValues[k] === selected[k]),
      ) ??
      variants.find((v) =>
        // Fallback: match at least the first key
        keys.slice(0, 1).every((k) => v.attributeValues[k] === selected[k]),
      ) ??
      variants[0] ??
      null
    );
  }, [variants, selected]);

  const pricePoisha = activeVariant?.pricePoisha ?? 0;
  const listPricePoisha = activeVariant?.compareAtPoisha ?? undefined;
  const stock = activeVariant?.stock ?? 0;

  const handleVariantChange = (key: string, value: string) => {
    setSelected((prev) => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'description', label: locale === 'bn' ? 'বিবরণ' : 'Description' },
    { id: 'specs', label: locale === 'bn' ? 'স্পেসিফিকেশন' : 'Specifications' },
    { id: 'reviews', label: locale === 'bn' ? `রিভিউ (${ratingCount.toLocaleString('en-US')})` : `Reviews (${ratingCount.toLocaleString('en-US')})` },
  ];

  return (
    <>
      <div className={styles.layout}>
        {/* Column 1: Gallery */}
        <div className={styles.colGallery}>
          <Gallery images={images} title={title} locale={locale} />
        </div>

        {/* Column 2: Info */}
        <div className={styles.colInfo}>
          <h1 className={styles.title}>{title}</h1>
          {brand ? (
            <p className={styles.byline}>
              {locale === 'bn' ? 'ব্র্যান্ড: ' : 'Brand: '}
              <span className={styles.brandLink}>{brand}</span>
            </p>
          ) : null}

          <div className={styles.ratingRow}>
            <RatingStars
              average={ratingAverage}
              count={ratingCount}
              size={20}
              countHref="#reviews"
              locale={locale}
            />
          </div>

          <div className={styles.priceRow}>
            <PriceBlock
              pricePoisha={pricePoisha}
              listPricePoisha={listPricePoisha}
              size="pdp"
              locale={locale}
            />
          </div>

          {variantGroups.length > 0 ? (
            <VariantPicker
              groups={variantGroups}
              selected={selected}
              onChange={handleVariantChange}
              locale={locale}
            />
          ) : null}

          {bulletFeatures.length > 0 ? (
            <ul className={styles.bullets}>
              {bulletFeatures.map((f, i) => (
                <li key={i} className={styles.bullet}>{f}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Column 3: Buy column (sticky desktop) */}
        <aside className={styles.colBuy} aria-label="Purchase">
          <div className={styles.buyCard}>
            <div className={styles.buyPrice}>
              <PriceBlock
                pricePoisha={pricePoisha}
                listPricePoisha={listPricePoisha}
                size="card"
                locale={locale}
              />
            </div>

            {isNew ? <Badge kind="new">New</Badge> : null}
            {bestSeller ? <Badge kind="best-seller">Best Seller</Badge> : null}

            <AddToCart
              productId={productId}
              variantId={activeVariant?.id ?? null}
              slug={slug}
              title={title}
              thumbnailUrl={images[0]?.url ?? null}
              pricePoisha={pricePoisha}
              stock={stock}
              sellerName={sellerName}
              locale={locale}
              labels={{
                addToCart: dict['card.add_to_cart'],
                buyNow: dict['card.buy_now'],
                notifyMe: locale === 'bn' ? 'স্টকে এলে জানান' : 'Notify Me',
                qty: dict['product.qty'],
                outOfStock: dict['product.out_of_stock'],
                inStock: dict['product.in_stock'],
                addedToCart: dict['cart.added'],
                lowStock: dict['product.low_stock'],
                wishlistAdd: locale === 'bn' ? 'ইচ্ছেতালিকায় যোগ করুন' : 'Add to wishlist',
                wishlistRemove: locale === 'bn' ? 'ইচ্ছেতালিকা থেকে সরান' : 'Remove from wishlist',
              }}
            />

            <div className={styles.trust}>
              <div className={styles.trustRow}>
                <TruckIcon /> {dict['product.free_delivery']}
              </div>
              <div className={styles.trustRow}>
                <ShieldIcon /> {locale === 'bn' ? '৭ দিনের রিটার্ন' : '7-day returns'}
              </div>
              <div className={styles.trustRow}>
                <LockIcon /> {locale === 'bn' ? 'নিরাপদ পেমেন্ট' : 'Secure checkout'}
              </div>
              {deliveryTime ? (
                <div className={styles.trustRow}>
                  <TruckIcon /> {deliveryTime}
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky tabs — span full width below 3-column */}
      <StickyTabs tabs={tabs} />

      {/* Video */}
      {videoUrl ? (
        <section id="video" className={styles.section}>
          <h2 className={styles.sectionTitle}>{locale === 'bn' ? 'ভিডিও' : 'Product Video'}</h2>
          <div style={{ position: 'relative', paddingTop: '56.25%', marginTop: 12 }}>
            <iframe
              src={toEmbedUrl(videoUrl)}
              title={title}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, borderRadius: 8 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      ) : null}

      {/* Description */}
      <section id="description" className={styles.section}>
        <h2 className={styles.sectionTitle}>{locale === 'bn' ? 'পণ্যের বিবরণ' : 'Product Description'}</h2>
        <div
          className={styles.description}
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      </section>

      {/* Specs */}
      {specs.length > 0 ? (
        <section id="specs" className={styles.section}>
          <h2 className={styles.sectionTitle}>{locale === 'bn' ? 'স্পেসিফিকেশন' : 'Specifications'}</h2>
          <table className={styles.specTable}>
            <tbody>
              {specs.map((s, i) => (
                <tr key={i}>
                  <th scope="row">{s.key}</th>
                  <td>{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {/* Reviews */}
      <section id="reviews" className={styles.section}>
        <ReviewsBlock
          summary={reviews.summary}
          reviews={reviews.items}
          locale={locale}
          labels={{
            title: dict['review.title'],
            writeReview: dict['review.write'],
            globalRatings: locale === 'bn' ? 'গ্লোবাল রেটিং' : 'global ratings',
            noReviews: locale === 'bn' ? 'এখনো কোনো রিভিউ নেই' : 'No reviews yet',
            verified: locale === 'bn' ? 'ভেরিফাইড' : 'Verified Purchase',
            helpful: locale === 'bn' ? 'সহায়ক?' : 'Helpful?',
            loadMore: locale === 'bn' ? 'আরো দেখুন' : 'Load more',
          }}
        />
      </section>

      {/* Mobile sticky buy bar */}
      <MobileBuyBar
        productId={productId}
        variantId={activeVariant?.id ?? null}
        slug={slug}
        title={title}
        thumbnailUrl={images[0]?.url ?? null}
        pricePoisha={pricePoisha}
        stock={stock}
        sellerName={sellerName}
        locale={locale}
        labels={{
          addToCart: dict['card.add_to_cart'],
          outOfStock: dict['product.out_of_stock'],
          addedToCart: dict['cart.added'],
        }}
      />
    </>
  );
}

// ── Helpers ──

function toEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return 'https://www.youtube.com/embed/' + yt[1];
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return 'https://player.vimeo.com/video/' + vimeo[1];
  return url;
}

function attributeLabel(key: string, locale: 'bn' | 'en'): string {
  const labels: Record<string, { bn: string; en: string }> = {
    color: { bn: 'রঙ', en: 'Color' },
    size: { bn: 'সাইজ', en: 'Size' },
    brand: { bn: 'ব্র্যান্ড', en: 'Brand' },
  };
  const found = labels[key];
  if (found) return locale === 'bn' ? found.bn : found.en;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function attributeValueLabel(value: string, locale: 'bn' | 'en'): string {
  const labels: Record<string, { bn: string; en: string }> = {
    black: { bn: 'কালো', en: 'Black' },
    white: { bn: 'সাদা', en: 'White' },
    blue: { bn: 'নীল', en: 'Blue' },
    red: { bn: 'লাল', en: 'Red' },
    green: { bn: 'সবুজ', en: 'Green' },
    s: { bn: 'S', en: 'S' },
    m: { bn: 'M', en: 'M' },
    l: { bn: 'L', en: 'L' },
    xl: { bn: 'XL', en: 'XL' },
  };
  const found = labels[value.toLowerCase()];
  if (found) return locale === 'bn' ? found.bn : found.en;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function TruckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7h11v9H3zM14 11h5l2 3v2h-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="1.6" fill="currentColor" />
      <circle cx="17" cy="18" r="1.6" fill="currentColor" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}