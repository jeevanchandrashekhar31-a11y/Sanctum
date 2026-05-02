import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sanctum',
    short_name: 'Sanctum',
    description: 'Daily Devotional & Bible Study',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0f1a',
    theme_color: '#d4a843',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
