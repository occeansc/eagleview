import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import InstallPrompt from '@/components/InstallPrompt'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

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
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon.png" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Sets the .dark class on <html> before first paint — reading
            localStorage synchronously, falling back to OS preference on a
            first-ever visit. Runs before React hydrates, so there is no
            flash of the wrong theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('eagleview-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased font-sans pb-20 sm:pb-0 min-h-dvh">
        <ThemeProvider>
          <Nav />
          {children}
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  )
}
