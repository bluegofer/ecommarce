/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@ecommarce/types'],
  eslint: { ignoreDuringBuilds: true },
  images: {
    formats: ['image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};
export default nextConfig;
