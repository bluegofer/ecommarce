/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@ecommarce/types'],
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
