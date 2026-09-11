import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SkyMart - Online Shopping in Bangladesh',
  description: 'SkyMart placeholder storefront. Step 7 builds the real design system.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}