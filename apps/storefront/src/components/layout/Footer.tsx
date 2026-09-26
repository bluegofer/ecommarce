import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import styles from './Footer.module.css';

export interface FooterProps {
  locale: 'bn' | 'en';
}

export function Footer({ locale }: FooterProps) {
  const year = new Date().getFullYear();
  const bn = locale === 'bn';
  const t = (en: string, bnText: string) => (bn ? bnText : en);

  return (
    <footer className={styles.footer}>
      <a href="#top" className={styles.backTop}>
        {t('Back to top', 'উপরে ফিরে যান')}
      </a>

      <div className={styles.columns}>
        {/* ── Column 1: Get to Know Us ── */}
        <details className={styles.column} open>
          <summary className={styles.heading}>
            <span>{t('Get to Know Us', 'আমাদের সম্পর্কে')}</span>
            <Chevron />
          </summary>
          <ul className={styles.links}>
            <li>
              <Link href={`/${locale}/pages/about`}>
                {t('About Us', 'আমাদের সম্পর্কে')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/contact`}>{t('Contact', 'যোগাযোগ')}</Link>
            </li>
            <li>
              <Link href={`/${locale}/pages/careers`}>
                {t('Careers', 'ক্যারিয়ার')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/pages/blog`}>{t('Blog', 'ব্লগ')}</Link>
            </li>
            <li>
              <Link href={`/${locale}/pages/privacy`}>
                {t('Privacy Policy', 'গোপনীয়তা নীতি')}
              </Link>
            </li>
          </ul>
        </details>

        {/* ── Column 2: Customer Service ── */}
        <details className={styles.column} open>
          <summary className={styles.heading}>
            <span>{t('Customer Service', 'গ্রাহক সেবা')}</span>
            <Chevron />
          </summary>
          <ul className={styles.links}>
            <li>
              <Link href={`/${locale}/faq`}>
                {t('Help Center / FAQ', 'সাহায্য কেন্দ্র / প্রশ্ন')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/account/orders`}>
                {t('Track Your Order', 'অর্ডার ট্র্যাক করুন')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/pages/returns`}>
                {t('Returns & Refunds', 'রিটার্ন ও রিফান্ড')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/pages/shipping`}>
                {t('Shipping Info', 'শিপিং তথ্য')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/pages/terms`}>
                {t('Terms of Service', 'সেবার শর্তাবলী')}
              </Link>
            </li>
          </ul>
        </details>

        {/* ── Column 3: Contact ── */}
        <details className={styles.column} open>
          <summary className={styles.heading}>
            <span>{t('Contact Us', 'যোগাযোগ করুন')}</span>
            <Chevron />
          </summary>
          <div className={styles.contact}>
            <div className={styles.contactRow}>
              <PhoneIcon />
              <div>
                <span className={styles.contactLabel}>
                  {t('Hotline:', 'হটলাইন:')}
                </span>
                <a href="tel:+8809612345678">09612-345-678</a>
              </div>
            </div>
            <div className={styles.contactRow}>
              <MailIcon />
              <div>
                <span className={styles.contactLabel}>
                  {t('Email:', 'ইমেইল:')}
                </span>
                <a href={`mailto:${BRAND.supportEmail}`}>
                  {BRAND.supportEmail}
                </a>
              </div>
            </div>
            <div className={styles.contactRow}>
              <PinSmallIcon />
              <div>
                <span className={styles.contactLabel}>
                  {t('Address:', 'ঠিকানা:')}
                </span>
                <span>
                  {t(
                    'House 12, Road 5, Dhanmondi, Dhaka 1205, Bangladesh',
                    'বাড়ি ১২, রোড ৫, ধানমন্ডি, ঢাকা ১২০৫, বাংলাদেশ',
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Social icons */}
          <div className={styles.social}>
            <div className={styles.socialLabel}>
              {t('Follow Us', 'আমাদের ফলো করুন')}
            </div>
            <div className={styles.socialRow}>
              <a
                href="https://facebook.com"
                className={styles.socialLink}
                aria-label="Facebook"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FacebookIcon />
              </a>
              <a
                href="https://instagram.com"
                className={styles.socialLink}
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <InstagramIcon />
              </a>
              <a
                href="https://youtube.com"
                className={styles.socialLink}
                aria-label="YouTube"
                target="_blank"
                rel="noopener noreferrer"
              >
                <YouTubeIcon />
              </a>
              <a
                href="https://wa.me/8809612345678"
                className={styles.socialLink}
                aria-label="WhatsApp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon />
              </a>
              <a
                href="https://tiktok.com"
                className={styles.socialLink}
                aria-label="TikTok"
                target="_blank"
                rel="noopener noreferrer"
              >
                <TikTokIcon />
              </a>
            </div>
          </div>
        </details>

        {/* ── Column 4: Payments ── */}
        <details className={styles.column} open>
          <summary className={styles.heading}>
            <span>{t('Payment Methods', 'পেমেন্ট পদ্ধতি')}</span>
            <Chevron />
          </summary>
          <div className={styles.payments}>
            <div className={styles.paymentsLabel}>
              {t('We Accept', 'আমরা গ্রহণ করি')}
            </div>
            <div className={styles.paymentsRow}>
              <span className={`${styles.payBadge} ${styles.payBadgeBkash}`}>
                bKash
              </span>
              <span className={`${styles.payBadge} ${styles.payBadgeNagad}`}>
                Nagad
              </span>
              <span className={`${styles.payBadge} ${styles.payBadgeRocket}`}>
                Rocket
              </span>
              <span className={`${styles.payBadge} ${styles.payBadgeVisa}`}>
                VISA
              </span>
              <span className={`${styles.payBadge} ${styles.payBadgeMc}`}>
                MasterCard
              </span>
              <span className={`${styles.payBadge} ${styles.payBadgeCod}`}>
                {t('Cash on Delivery', 'ক্যাশ অন ডেলিভারি')}
              </span>
            </div>
          </div>
        </details>
      </div>

      <div className={styles.divider} />

      {/* ── Brand center ── */}
      <div className={styles.brandCenter}>
        <span className={styles.brandMark}>
          <Pin /> {BRAND.name}
        </span>
        <div className={styles.selectors}>
          <span>
            {t('Language', 'ভাষা')}: {bn ? 'বাংলা' : 'English'}
          </span>
          <span aria-hidden="true">·</span>
          <span>{t('Currency', 'মুদ্রা')}: ৳ BDT</span>
          <span aria-hidden="true">·</span>
          <span>{t('Country', 'দেশ')}: BD</span>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className={styles.bottomBar}>
        <span>
          © {year} {BRAND.name}
        </span>
        <nav className={styles.legal} aria-label="Legal">
          <Link href={`/${locale}/pages/terms`}>
            {t('Terms & Conditions', 'শর্তাবলী')}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href={`/${locale}/pages/privacy`}>
            {t('Privacy Policy', 'গোপনীয়তা নীতি')}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href={`/${locale}/pages/returns`}>
            {t('Return Policy', 'রিটার্ন নীতি')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}

// ── Icons ──

function Chevron() {
  return (
    <svg
      className={styles.chevron}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <polyline
        points="6 9 12 15 18 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Pin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22s8-6.5 8-12a8 8 0 10-16 0c0 5.5 8 12 8 12z"
        fill="var(--sk-brand-300)"
      />
      <circle cx="12" cy="10" r="3" fill="var(--sk-brand-950)" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M3 7l9 6 9-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PinSmallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.58v1.87h2.78l-.45 2.91h-2.33V22c4.78-.76 8.43-4.92 8.43-9.94z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 00-2.12-2.12C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.58A3 3 0 00.5 6.2C0 8.08 0 12 0 12s0 3.92.5 5.8a3 3 0 002.12 2.12C4.5 20.5 12 20.5 12 20.5s7.5 0 9.38-.58a3 3 0 002.12-2.12C24 15.92 24 12 24 12s0-3.92-.5-5.8zM9.6 15.6V8.4l6.4 3.6-6.4 3.6z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.52 3.48A12 12 0 003.6 20.4L2 22l1.62-1.6a12 12 0 0016.9-16.92zM12 21a9 9 0 01-4.6-1.27l-.33-.2-2.72.72.72-2.65-.22-.35A9 9 0 1112 21zm5.17-6.79c-.28-.14-1.66-.82-1.92-.91-.26-.1-.45-.14-.64.14-.19.28-.74.91-.91 1.1-.17.19-.33.21-.61.07-.28-.14-1.19-.44-2.27-1.4-.84-.75-1.4-1.67-1.57-1.95-.17-.28-.02-.43.12-.57.12-.12.28-.33.42-.5.14-.17.19-.28.28-.47.09-.19.05-.35-.02-.5-.07-.14-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.49-.17 0-.35-.01-.53-.01s-.5.07-.76.35c-.26.28-1 .97-1 2.37s1.02 2.75 1.16 2.94c.14.19 2 3.05 4.83 4.28.67.29 1.2.46 1.61.59.68.22 1.29.19 1.78.11.54-.08 1.66-.68 1.9-1.34.23-.66.23-1.22.16-1.34-.07-.12-.26-.19-.54-.33z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.34 20a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.38-.01z" />
    </svg>
  );
}