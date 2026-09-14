/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@ecommarce/types'],
  eslint: { ignoreDuringBuilds: true },
  images: {
    formats: ['image/webp'],
    // Step 14.5 — tightened from `hostname: '**'` to explicit hosts.
    // Add new hosts here when a new CDN/bucket is introduced.
    remotePatterns: [
      // Local dev / API-served uploads
      { protocol: 'http', hostname: 'localhost' },
      // S3 (ap-south-1) and CDN — Step 15 wires the real domain
      { protocol: 'https', hostname: '*.s3.*.amazonaws.com' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
      // Data URLs (dev-seed placeholders) are handled by next/image natively.
    ],
  },
};
export default nextConfig;