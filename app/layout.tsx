import type { Metadata } from 'next'
import { Outfit, DM_Mono } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Eagleview',
  description: 'Sector heat rankings with benchmark comparison — 1W · 1M · 3M · YTD',
  openGraph: {
    title: 'Eagleview',
    description: 'Track sector momentum vs S&P 500, Nasdaq & Dow across 1W, 1M, 3M and YTD',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmMono.variable}`}>
      <body className="bg-slate-100 antialiased font-sans">{children}</body>
    </html>
  )
}
