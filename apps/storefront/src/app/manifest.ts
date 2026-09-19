import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BlueGofer — Online Shopping in Bangladesh',
    short_name: 'BlueGofer',
    description:
      'BlueGofer — a category-agnostic marketplace placeholder. Fast delivery, safe payments, easy returns.',
    start_url: '/bn',
    display: 'standalone',
    background_color: '#F6FAFD',
    theme_color: '#87CEEB',
    orientation: 'portrait',
    scope: '/',
    lang: 'bn',
    dir: 'ltr',
    categories: ['shopping', 'ecommerce'],
    icons: [
      {
        src: '/icons/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}