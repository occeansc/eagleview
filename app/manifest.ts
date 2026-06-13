import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'Eagleview',
    short_name:       'Eagleview',
    description:      'Curated thematic sector heat rankings — 1W · 1M · 3M · YTD',
    start_url:        '/',
    display:          'standalone',
    background_color: '#f1f5f9',
    theme_color:      '#0f172a',
    orientation:      'portrait',
    icons: [
      {
        src:     '/apple-icon.png',
        sizes:   '180x180',
        type:    'image/png',
        purpose: 'any maskable',
      },
    ],
  }
}
