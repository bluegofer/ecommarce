import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SkyMart — Online Shopping in Bangladesh',
    template: '%s | SkyMart',
  },
  description:
    'SkyMart — a category-agnostic marketplace placeholder. Step 7 builds the design system.',
  applicationName: 'SkyMart',
  formatDetection: { telephone: false, email: false, address: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // lang="bn" is the default; [locale]/layout.tsx overrides it on the client
  // once the URL param is known (App Router root layout cannot read params).
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}