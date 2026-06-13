import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Nav from '@/components/Nav'
import './globals.css'

const inter = Inter({
  subsets: ['latin'], variable: '--font-inter', display: 'swap',
})
const mono = JetBrains_Mono({
  subsets: ['latin'], variable: '--font-mono', display: 'swap',
})

export const metadata: Metadata = {
  title:       { default: 'Eagleview', template: '%s · Eagleview' },
  description: 'Curated thematic sector heat rankings — 1W · 1M · 3M · YTD',
  icons: {
    icon:  [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
  themeColor: '#0f172a',
  appleWebApp: {
    capable: true,
    title:   'Eagleview',
    statusBarStyle: 'black-translucent',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon.png" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased font-sans pb-20 sm:pb-0 min-h-screen">
        <Nav />
        {children}
      </body>
    </html>
  )
}
