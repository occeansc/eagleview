'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { EagleIcon, HomeIcon, GridIcon, SearchIcon, BookmarkIcon } from './Icons'

const TABS = [
  { href: '/',          label: 'Dashboard', Icon: HomeIcon     },
  { href: '/heatmap',   label: 'Heatmap',   Icon: GridIcon     },
  { href: '/screener',  label: 'Screener',  Icon: SearchIcon   },
  { href: '/watchlist', label: 'Watchlist', Icon: BookmarkIcon },
]

export default function Nav() {
  const path = usePathname()

  return (
    <>
      {/* ── Desktop — frosted top bar ─────────────── */}
      <nav className="nav-glass hidden sm:flex items-center justify-between px-6 xl:px-8 py-3 sticky top-0 z-40">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2.5 mr-5 group">
            <div className="p-1.5 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-white/80 shadow-sm group-hover:scale-105 transition-transform">
              <EagleIcon size={17} className="text-slate-800" />
            </div>
            <span className="font-extrabold tracking-tight text-[15px] bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent group-hover:from-indigo-700 group-hover:to-indigo-500 transition-all">
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
                  <Icon size={13} className={active ? 'text-indigo-300' : 'text-slate-400'} />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>

        <span className="text-[10px] font-bold text-slate-400 bg-slate-100/60 px-2.5 py-1 rounded-full border border-slate-200/50 tracking-widest">
          V4.2.0
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
                active ? 'text-indigo-600 -translate-y-0.5' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon size={18} className={active ? 'drop-shadow-sm' : ''} />
              <span className="text-[10px] font-bold tracking-wide">{label}</span>
              {active && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_1px_6px_rgba(99,102,241,0.6)]" />
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
