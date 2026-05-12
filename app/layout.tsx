import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Nav from '@/components/Nav'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const mono  = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Eagleview', template: '%s · Eagleview' },
  description: 'Curated thematic sector heat rankings — 1W · 1M · 3M · YTD',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="bg-slate-100 antialiased font-sans pb-20 sm:pb-0 min-h-screen">
        <Nav />
        {children}
      </body>
    </html>
  )
}
