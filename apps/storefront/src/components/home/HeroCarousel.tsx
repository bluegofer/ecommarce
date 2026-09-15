'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './HeroCarousel.module.css';

export interface HeroSlide {
  imageUrl: string;
  titleEn: string;
  titleBn: string;
  ctaHref: string;
  ctaLabelEn: string;
  ctaLabelBn: string;
}

export interface HeroCarouselProps {
  slides: HeroSlide[];
  /** Autoplay interval in ms (UI Spec C1: 6000). Set 0 to disable. */
  autoplayMs?: number;
  locale: 'bn' | 'en';
}

export function HeroCarousel({ slides, autoplayMs = 6000, locale }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = slides.length;

  useEffect(() => {
    if (total <= 1) return;
    if (reducedMotion || paused || autoplayMs <= 0) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, autoplayMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, paused, autoplayMs, reducedMotion]);

  if (total === 0) return null;

  const slide = slides[index]!;
  const title = locale === 'bn' ? slide.titleBn : slide.titleEn;
  const ctaLabel = locale === 'bn' ? slide.ctaLabelBn : slide.ctaLabelEn;

  return (
    <section
      className={styles.hero}
      aria-roledescription="carousel"
      aria-label={locale === 'bn' ? 'ফিচার্ড' : 'Featured'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className={styles.slideWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.image}
          src={slide.imageUrl}
          alt={title}
          width={1600}
          height={500}
        />
        <div className={styles.caption}>
          <h2 className={styles.captionTitle}>{title}</h2>
          <Link href={slide.ctaHref} className={styles.cta}>{ctaLabel}</Link>
        </div>
      </div>

      {total > 1 ? (
        <>
          <button
            type="button"
            className={[styles.arrow, styles.arrowPrev].join(' ')}
            onClick={() => setIndex((i) => (i - 1 + total) % total)}
            aria-label={locale === 'bn' ? 'আগের' : 'Previous slide'}
          >
            ‹
          </button>
          <button
            type="button"
            className={[styles.arrow, styles.arrowNext].join(' ')}
            onClick={() => setIndex((i) => (i + 1) % total)}
            aria-label={locale === 'bn' ? 'পরের' : 'Next slide'}
          >
            ›
          </button>
          <div className={styles.dots} role="tablist">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`${i + 1} / ${total}`}
                className={[styles.dot, i === index ? styles.dotActive : ''].filter(Boolean).join(' ')}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}