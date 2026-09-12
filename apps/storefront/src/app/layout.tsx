import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegistrar, InstallPrompt } from '@/components/pwa';

export const metadata: Metadata = {
  title: {
    default: 'SkyMart — Online Shopping in Bangladesh',
    template: '%s | SkyMart',
  },
  description:
    'SkyMart — a category-agnostic marketplace placeholder. Fast delivery, safe payments, easy returns.',
  applicationName: 'SkyMart',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'SkyMart',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/apple-touch-icon.svg',
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
    <html lang="bn">
      <body>
        {children}
        <ServiceWorkerRegistrar />
        <InstallPrompt
          labels={{
            title: 'Install SkyMart',
            body: 'Add SkyMart to your home screen for faster shopping',
            install: 'Install',
            dismiss: 'Dismiss',
          }}
        />
      </body>
    </html>
  );
}