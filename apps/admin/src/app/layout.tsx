import type { Metadata } from 'next';
import { Inter, Noto_Sans_Bengali } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const bengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-bengali',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BlueGofer Admin — Operations Console',
  description: 'E-Commerce + ERP platform — internal operations console',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={`${inter.variable} ${bengali.variable}`}>
      <body className="font-sans antialiased bg-bg text-slate-700">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}