'use client';

import { useState } from 'react';
import styles from './Gallery.module.css';

export interface GalleryImage {
  url: string;
  altText: string | null;
}

export interface GalleryProps {
  images: GalleryImage[];
  /** Product title — used for alt fallback. */
  title: string;
  locale: 'bn' | 'en';
}

/**
 * PDP image gallery (UI Spec C3).
 * - Main image 1:1, 420px desktop
 * - 64px square thumbnails below
 * - Hover zoom lens on desktop (scale 2x within a clipped container)
 * - Swipe dots on mobile
 * - Lightbox is Step 8.11 (deferred)
 */
export function Gallery({ images, title, locale }: GalleryProps) {
  const safeImages = images.length > 0 ? images : [{ url: placeholderSvg(title), altText: title }];
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  const active = safeImages[activeIdx]!;

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({ x, y });
  };

  return (
    <div className={styles.wrap}>
      <div
        className={styles.main}
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={handleMove}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={active.url}
          alt={active.altText ?? title}
          className={styles.mainImg}
          style={zoom ? { transformOrigin: `${origin.x}% ${origin.y}%`, transform: 'scale(2)' } : undefined}
        />
      </div>

      {safeImages.length > 1 ? (
        <div className={styles.thumbs}>
          {safeImages.map((img, i) => (
            <button
              key={i}
              type="button"
              className={[styles.thumb, i === activeIdx ? styles.thumbActive : ''].filter(Boolean).join(' ')}
              onClick={() => setActiveIdx(i)}
              aria-label={`${locale === 'bn' ? 'ছবি' : 'Image'} ${i + 1}`}
              aria-current={i === activeIdx}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.altText ?? `${title} ${i + 1}`} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function placeholderSvg(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#EFF7FB"/><text x="200" y="200" font-family="Inter,sans-serif" font-size="24" fill="#25729A" text-anchor="middle" dominant-baseline="middle">${escapeXml(label.slice(0, 30))}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c] ?? c));
}