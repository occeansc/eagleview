'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { EagleIcon, HomeIcon, GridIcon, SearchIcon, BookmarkIcon } from './Icons'
import { getSupabaseClient } from '@/lib/supabase'

const TABS = [
  { href: '/',          label: 'Dashboard', Icon: HomeIcon     },
  { href: '/heatmap',   label: 'Heatmap',   Icon: GridIcon     },
  { href: '/screener',  label: 'Screener',  Icon: SearchIcon   },
  { href: '/watchlist', label: 'Watchlist', Icon: BookmarkIcon },
]

const CACHE_KEY  = 'eagleview-sentiment'
const CACHE_TIME = 'eagleview-sentiment-time'
const CACHE_TTL  = 900_000 // 15 min — aligns with revalidate = 900

// Tri-state: null = loading, bull/bear/neutral = resolved
type Sentiment = 'bull' | 'bear' | 'neutral' | null

export default function Nav() {
  const path = usePathname()
  const [sentiment, setSentiment] = useState<Sentiment>(null)

  useEffect(() => {
    try {
      const cached   = localStorage.getItem(CACHE_KEY)
      const cachedAt = localStorage.getItem(CACHE_TIME)
      const fresh    = cachedAt && Date.now() - Number(cachedAt) < CACHE_TTL
      if (cached && fresh) { setSentiment(cached as Sentiment); return }
    } catch { /* localStorage unavailable */ }

    // Fetch 22-row ytd_pct — tiny query, explicit cast for TypeScript
    getSupabaseClient()
      .from('sectors')
      .select('ytd_pct')
      .then(({ data }) => {
        if (!data?.length) return
        const rows = data as Array<{ ytd_pct: number | null }>
        const pos  = rows.filter(s => (s.ytd_pct ?? 0) > 0).length
        const neg  = rows.filter(s => (s.ytd_pct ?? 0) < 0).length
        const result: Sentiment = pos > neg ? 'bull' : neg > pos ? 'bear' : 'neutral'
        setSentiment(result)
        try {
          localStorage.setItem(CACHE_KEY,  result)
          localStorage.setItem(CACHE_TIME, String(Date.now()))
        } catch { /* localStorage unavailable */ }
      })
  }, [])

  // Accent colours — null (loading) uses slate, not purple
  const iconActive =
    sentiment === 'bull'    ? 'text-emerald-400' :
    sentiment === 'bear'    ? 'text-rose-400'    :
    sentiment === 'neutral' ? 'text-slate-400'   :
                              'text-slate-400'    // loading

  const mobileActive =
    sentiment === 'bull'    ? 'text-emerald-600' :
    sentiment === 'bear'    ? 'text-rose-500'    :
                              'text-slate-500'

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
            <div className="p-1.5 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-white/80 shadow-sm group-hover:scale-105 transition-transform">
              <EagleIcon size={17} className="text-slate-800" />
            </div>
            {/* No purple anywhere — hover stays in slate family */}
            <span className="font-extrabold tracking-tight text-[15px] bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent group-hover:from-slate-700 group-hover:to-slate-500 transition-all">
              Eagleview
            </span>
          </Link>

          <div className="h-5 w-px bg-slate-200/70 mr-4" />

          <div className="flex items-center gap-1">
            {TABS.map(({ href, label, Icon }) => {
              const active = path === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-250 ${
                    active
                      ? 'bg-slate-900 text-white shadow-[0_4px_12px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/10'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white/70 hover:shadow-sm'
                  }`}
                >
                  <Icon size={13} className={active ? iconActive : 'text-slate-400'} />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>

        <span className="text-[10px] font-bold text-slate-400 bg-slate-100/60 px-2.5 py-1 rounded-full border border-slate-200/50 tracking-widest">
          V4.4.2
        </span>
      </nav>

      {/* ── Mobile — frosted bottom bar ───────────── */}
      <nav className="nav-glass-mobile sm:hidden fixed bottom-0 inset-x-0 z-50 flex pb-[env(safe-area-inset-bottom,4px)]">
        {TABS.map(({ href, label, Icon }) => {
          const active = path === href
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all duration-200 ${
                active ? `${mobileActive} -translate-y-0.5` : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon size={18} className={active ? 'drop-shadow-sm' : ''} />
              <span className="text-[10px] font-bold tracking-wide">{label}</span>
              {active && (
                <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${mobileDot}`} />
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
