'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { HeroSlide } from './HeroCarousel';
import styles from './HeroSlider.module.css';

export interface HeroSliderProps {
  slides: HeroSlide[];
  autoplayMs?: number;
  locale: 'bn' | 'en';
}

function ChevLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="6 4 20 12 6 20" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

export function HeroSlider({ slides, autoplayMs = 6000, locale }: HeroSliderProps) {
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
  const bn = locale === 'bn';

  const title = bn ? slide.titleBn : slide.titleEn;
  const subtitle = bn ? (slide.subtitleBn ?? '') : (slide.subtitleEn ?? '');
  const eyebrow = bn ? (slide.eyebrowBn ?? '') : (slide.eyebrowEn ?? '');
  const badge = bn ? (slide.badgeTextBn ?? '') : (slide.badgeTextEn ?? '');
  const ctaLabel = bn ? slide.ctaLabelBn : slide.ctaLabelEn;
  const sideLabel = bn ? (slide.sideTileLabelBn ?? '') : (slide.sideTileLabelEn ?? '');
  const hasSideTile = Boolean(slide.sideTileImage);

  return (
    <section
      className={styles.slider}
      aria-roledescription="carousel"
      aria-label={bn ? 'ফিচার্ড' : 'Featured'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className={styles.track} style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((s, i) => {
          const t = bn ? s.titleBn : s.titleEn;
          const st = bn ? (s.subtitleBn ?? '') : (s.subtitleEn ?? '');
          const ey = bn ? (s.eyebrowBn ?? '') : (s.eyebrowEn ?? '');
          const bd = bn ? (s.badgeTextBn ?? '') : (s.badgeTextEn ?? '');
          const cta = bn ? s.ctaLabelBn : s.ctaLabelEn;
          const sLabel = bn ? (s.sideTileLabelBn ?? '') : (s.sideTileLabelEn ?? '');
          const tileBg = i % 2 === 0 ? styles.bgWarm : styles.bgCool;

          return (
            <div key={i} className={styles.slide} aria-hidden={i !== index}>
              <div className={styles.tileMain}>
                <div className={`${styles.tileContent} ${tileBg}`}>
                  {ey && <p className={styles.eyebrow}>{ey}</p>}
                  {st && <h2 className={styles.headline}>{st}</h2>}
                  <p className={styles.title}>{t}</p>
                  {bd && <span className={styles.badge}>{bd}</span>}
                  <Link href={s.ctaHref} className={styles.cta}>{cta}</Link>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.imageMain} src={s.imageUrl} alt={t} loading={i === 0 ? 'eager' : 'lazy'} />
              </div>

              {s.sideTileImage && (
                <div className={styles.tileSide}>
                  <div className={styles.tileSideContent}>
                    {sLabel && <p className={styles.sideLabel}>{sLabel}</p>}
                    {s.sideTileCtaHref && (
                      <Link href={s.sideTileCtaHref} className={styles.sideCta}>
                        {bn ? 'দেখুন' : 'Shop now'} →
                      </Link>
                    )}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.imageSide} src={s.sideTileImage} alt="" loading="lazy" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowPrev}`}
            onClick={() => setIndex((i) => (i - 1 + total) % total)}
            aria-label={bn ? 'আগের' : 'Previous'}
          >
            <ChevLeft />
          </button>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowNext}`}
            onClick={() => setIndex((i) => (i + 1) % total)}
            aria-label={bn ? 'পরের' : 'Next'}
          >
            <ChevRight />
          </button>

          <div className={styles.controls}>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className={styles.playPause}
              aria-label={paused ? (bn ? 'চালান' : 'Play') : (bn ? 'বিরতি' : 'Pause')}
            >
              {paused ? <PlayIcon /> : <PauseIcon />}
            </button>
            <div className={styles.dots} role="tablist">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`${i + 1} / ${total}`}
                  className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          </div>
        </>
      )}
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