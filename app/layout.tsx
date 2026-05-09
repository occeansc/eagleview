import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Eagleview',
  description: 'Curated sector heat rankings with benchmark comparison — 1W · 1M · 3M · YTD',
  openGraph: {
    title: 'Eagleview',
    description: 'Track curated thematic sector momentum vs S&P 500, Nasdaq & Dow',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-slate-100 antialiased font-sans">{children}</body>
    </html>
  )
}
