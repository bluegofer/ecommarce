import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  transpilePackages: ['@ecommarce/types'],
  eslint: { ignoreDuringBuilds: true },
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 2592000,
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '*.s3.*.amazonaws.com' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
    ],
  },
  async headers() {
    return [
      {
        source: '/sitemap.xml',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400' },
          { key: 'Content-Type', value: 'application/xml; charset=utf-8' },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400' },
          { key: 'Content-Type', value: 'text/plain; charset=utf-8' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
export default withSentryConfig(nextConfig, {
  // Sentry organization + project (Step 15.11)
  org: 'bluegofer',
  project: 'bluegofer-storefront',

  // CI/deploy behavior: don't fail build if Sentry upload fails
  silent: true,

  // Upload a larger set of source maps for better stack traces
  widenClientFileUpload: true,

  // Hide source maps from client bundle (security)
  hideSourceMaps: true,

  // Reduce server bundle size by disabling Sentry logger
  disableLogger: true,

  // Auto-instrument Vercel Cron Monitors if/when deployed to Vercel (future)
  automaticVercelMonitors: false,
});