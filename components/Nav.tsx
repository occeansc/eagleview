'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import { EagleIcon, HomeIcon, GridIcon, SearchIcon, BookmarkIcon, CalendarIcon } from './Icons'
import { getSupabaseClient } from '@/lib/supabase'

const TABS = [
  { href: '/',          label: 'Dashboard', Icon: HomeIcon     },
  { href: '/heatmap',   label: 'Heatmap',   Icon: GridIcon     },
  { href: '/screener',  label: 'Screener',  Icon: SearchIcon   },
  { href: '/earnings',  label: 'Earnings',  Icon: CalendarIcon },
  { href: '/watchlist', label: 'Watchlist', Icon: BookmarkIcon },
]

const CACHE_KEY  = 'eagleview-sentiment'
const CACHE_TIME = 'eagleview-sentiment-time'
const CACHE_TTL  = 300_000 // 5 min — aligns with price-page revalidate = 300
const REFRESH_KEY = 'eagleview-last-visibility-refresh'
const REFRESH_TTL = 300_000 // avoid a forced refresh on every app open/page resume

const PERIOD_FIELDS = {
  '1D':  'day_pct',
  '1W':  'week_pct',
  '1M':  'month_pct',
  '3M':  'quarter_pct',
  '6M':  'half_year_pct',
  'YTD': 'ytd_pct',
  '1Y':  'year_pct',
  '5Y':  'five_year_pct',
} as const

type NavPeriod = keyof typeof PERIOD_FIELDS
const PERIOD_SET = new Set<NavPeriod>(Object.keys(PERIOD_FIELDS) as NavPeriod[])

function parsePeriod(value: string | null): NavPeriod {
  return value && PERIOD_SET.has(value as NavPeriod) ? value as NavPeriod : '1D'
}

function hrefWithPeriod(href: string, period: NavPeriod) {
  return `${href === '/' ? '/' : href}?period=${encodeURIComponent(period)}`
}

// Tri-state: null = loading, bull/bear/neutral = resolved
type Sentiment = 'bull' | 'bear' | 'neutral' | null

export default function Nav() {
  const path   = usePathname()
  const router = useRouter()
  const [period, setPeriod] = useState<NavPeriod>('1D')
  const periodField  = PERIOD_FIELDS[period]
  const cacheKey     = `${CACHE_KEY}-${period}`
  const cacheTimeKey = `${CACHE_TIME}-${period}`
  const [sentiment, setSentiment] = useState<Sentiment>(null)

  // Warm route bundles after first paint so switching tabs feels instant.
  useEffect(() => {
    TABS.forEach(({ href }) => {
      if (href !== path) router.prefetch(href)
    })
  }, [path, router])

  // Keep nav sentiment period in sync with the dashboard URL period without
  // using useSearchParams(), which would force CSR bailouts during static build.
  useEffect(() => {
    const syncFromUrl = () => {
      setPeriod(parsePeriod(new URLSearchParams(window.location.search).get('period')))
    }
    const onPeriodChange = (event: Event) => {
      const detail = (event as CustomEvent<NavPeriod>).detail
      setPeriod(parsePeriod(detail ?? null))
    }
    syncFromUrl()
    window.addEventListener('popstate', syncFromUrl)
    window.addEventListener('eagleview-period-change', onPeriodChange)
    return () => {
      window.removeEventListener('popstate', syncFromUrl)
      window.removeEventListener('eagleview-period-change', onPeriodChange)
    }
  }, [path])

  // Re-fetch fresh server data when the app becomes visible again, but throttle
  // it. Refreshing on every iOS pageshow made the app feel like it was dragging
  // even when the user was simply switching pages or briefly reopening it.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      try {
        const last = Number(sessionStorage.getItem(REFRESH_KEY) || '0')
        if (Date.now() - last < REFRESH_TTL) return
        sessionStorage.setItem(REFRESH_KEY, String(Date.now()))
      } catch { /* sessionStorage unavailable: still refresh */ }
      router.refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onVisible)
    }
  }, [router])

  useEffect(() => {
    setSentiment(null)
    try {
      const cached   = localStorage.getItem(cacheKey)
      const cachedAt = localStorage.getItem(cacheTimeKey)
      const fresh    = cachedAt && Date.now() - Number(cachedAt) < CACHE_TTL
      if (cached && fresh) { setSentiment(cached as Sentiment); return }
    } catch { /* localStorage unavailable */ }

    // Fetch the same period field the dashboard is showing, so the nav
    // accent follows the current timeframe instead of being pinned to YTD.
    getSupabaseClient()
      .from('sectors')
      .select(periodField)
      .then(({ data }) => {
        if (!data?.length) return
        const rows = data as Array<Record<typeof periodField, number | null>>
        const pos  = rows.filter(s => (s[periodField] ?? 0) > 0).length
        const neg  = rows.filter(s => (s[periodField] ?? 0) < 0).length
        const result: Sentiment = pos > neg ? 'bull' : neg > pos ? 'bear' : 'neutral'
        setSentiment(result)
        try {
          localStorage.setItem(cacheKey,     result)
          localStorage.setItem(cacheTimeKey, String(Date.now()))
        } catch { /* localStorage unavailable */ }
      })
  }, [periodField, cacheKey, cacheTimeKey])

  // Accent colours — null (loading) uses slate, not purple.
  // Desktop keeps the active pill neutral; only the small menu icon is dynamic.
  const desktopActive =
    'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/10 dark:ring-slate-100/20'

  const iconActive =
    sentiment === 'bull'    ? 'text-emerald-400 dark:text-emerald-500' :
    sentiment === 'bear'    ? 'text-rose-400 dark:text-rose-500'       :
    sentiment === 'neutral' ? 'text-slate-400 dark:text-slate-500'     :
                              'text-slate-400 dark:text-slate-500'      // loading

  const mobileActive =
    sentiment === 'bull'    ? 'text-emerald-600 dark:text-emerald-400' :
    sentiment === 'bear'    ? 'text-rose-500 dark:text-rose-400'    :
                              'text-slate-500 dark:text-slate-400'

  const mobileDot =
    sentiment === 'bull'
      ? 'bg-emerald-500 shadow-[0_1px_6px_rgba(16,185,129,0.55)]'
      : sentiment === 'bear'
      ? 'bg-rose-500 shadow-[0_1px_6px_rgba(244,63,94,0.5)]'
      : 'bg-slate-400 shadow-[0_1px_4px_rgba(100,116,139,0.30)]' // neutral or loading

  return (
    <>
      {/* ── Desktop — frosted top bar ─────────────── */}
      <nav className="nav-glass hidden sm:flex items-center justify-between px-6 xl:px-8 py-3 sticky top-0 z-40">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2.5 mr-5 group">
            <div className="p-1.5 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border border-white/80 dark:border-white/10 shadow-sm group-hover:scale-105 transition-transform">
              <EagleIcon size={17} className="text-slate-800 dark:text-slate-200" />
            </div>
            {/* No purple anywhere — hover stays in slate family */}
            <span className="font-bold tracking-tight text-[15px] bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent group-hover:from-slate-700 group-hover:to-slate-500 dark:group-hover:from-slate-200 dark:group-hover:to-slate-500 transition-all">
              Eagleview
            </span>
          </Link>

          <div className="h-5 w-px bg-slate-200/70 dark:bg-white/20 mr-4" />

          <div className="flex items-center gap-1">
            {TABS.map(({ href, label, Icon }) => {
              const active = path === href
              return (
                <Link
                  key={href}
                  href={hrefWithPeriod(href, period)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-250 ${
                    active
                      ? desktopActive
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/70 dark:hover:bg-slate-900/70 hover:shadow-sm'
                  }`}
                >
                  <Icon size={13} className={active ? iconActive : 'text-slate-400 dark:text-slate-500'} />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100/60 dark:bg-white/10 px-2.5 py-1 rounded-full border border-slate-200/50 dark:border-white/20 tracking-wide">
            V4.4.41
          </span>
        </div>
      </nav>

      {/* ── Mobile — frosted bottom bar ───────────── */}
      <nav className="nav-glass-mobile sm:hidden fixed bottom-0 inset-x-0 z-50 flex pb-[env(safe-area-inset-bottom,4px)]">
        {TABS.map(({ href, label, Icon }) => {
          const active = path === href
          return (
            <Link
              key={href}
              href={hrefWithPeriod(href, period)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-w-0 transition-all duration-200 ${
                active ? `${mobileActive} -translate-y-0.5` : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
              }`}
            >
              <Icon size={17} className={active ? 'drop-shadow-sm' : ''} />
              <span className="text-[9px] font-bold whitespace-nowrap">{label}</span>
              {active && (
                <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${mobileDot}`} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Mobile — floating toggle, top-right corner ─────────
          The bottom bar is full (5 primary nav tabs), so the toggle
          lives here instead: small, out of the way, always reachable.
          Uses a dedicated glass pill (not .nav-glass, which is built for
          a full-width bar with a one-sided border — wrong shape entirely
          for a small floating circular control). */}
      <div
        className="sm:hidden fixed top-[calc(env(safe-area-inset-top,0px)+8px)] right-2.5 z-50 inline-flex rounded-full bg-white/95 dark:bg-slate-900/95"
        style={{
          padding: 3,
          backdropFilter: 'var(--glass-blur-nav)',
          WebkitBackdropFilter: 'var(--glass-blur-nav)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
        }}
      >
        <ThemeToggle />
      </div>
    </>
  )
}
