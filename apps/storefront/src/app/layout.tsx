// apps/storefront/src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegistrar, InstallPrompt } from '@/components/pwa';
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo/json-ld';
import { BRAND } from '@/lib/brand';

// metadataBase fixes Next.js resolve of relative OG/Twitter image URLs.
// Without it, Next.js falls back to http://localhost:3000 in production.
export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: {
    default: `${BRAND.name} — ${BRAND.taglineEn}`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.descriptionEn,
  applicationName: BRAND.name,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: BRAND.name,
  },
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: BRAND.icons.icon,
    apple: BRAND.icons.apple,
  },
};

export const viewport: Viewport = {
  themeColor: '#87CEEB',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // lang="bn" is the default; [locale]/layout.tsx overrides it on the client
  // once the URL param is known (App Router root layout cannot read params).
  return (
    <html lang={BRAND.locales.default}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd(BRAND.locales.default)) }}
        />
        {children}
        <ServiceWorkerRegistrar />
        <InstallPrompt
          labels={{
            title: `Install ${BRAND.name}`,
            body: `Add ${BRAND.name} to your home screen for faster shopping`,
            install: 'Install',
            dismiss: 'Dismiss',
          }}
        />
      </body>
    </html>
  );
}