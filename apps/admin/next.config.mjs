import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@ecommarce/types'],
  eslint: { ignoreDuringBuilds: true },
};
export default withSentryConfig(nextConfig, {
  org: 'bluegofer',
  project: 'bluegofer-admin',
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});