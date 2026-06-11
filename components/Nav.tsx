--- START OF FILE eagleview-v40/components/Nav.tsx ---
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
      <nav className="hidden sm:flex items-center justify-between px-6 xl:px-8 py-3 bg-white/60 backdrop-blur-xl border-b border-white/50 sticky top-0 z-40 shadow-[0_1px_8px_-4px_rgba(0,0,0,0.06)] transition-all supports-[backdrop-filter]:bg-white/50">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2 mr-6 group text-slate-800">
            <div className="p-1.5 rounded-xl group-hover:scale-105 transition-transform bg-gradient-to-br from-slate-100 to-slate-200 border border-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <EagleIcon size={18} />
            </div>
            <span className="font-extrabold tracking-tight text-[15px] bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent group-hover:from-indigo-600 group-hover:to-indigo-500 transition-colors">
              Eagleview
            </span>
          </Link>
          <div className="h-6 w-px bg-slate-200/60 mr-4" />
          <div className="flex items-center gap-1.5">
            {TABS.map(({ href, label, Icon }) => {
              const active = path === href
              return (
                <Link key={href} href={href} className={`nav-item relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${active ? 'bg-slate-900 text-white shadow-[0_4px_12px_rgba(15,23,42,0.15)] ring-1 ring-slate-900/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 hover:shadow-sm'}`}>
                  <Icon size={14} className={active ? 'text-indigo-200' : 'text-slate-400 group-hover:text-slate-700'} />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
           <span className="text-xs font-semibold text-slate-400 bg-slate-100/50 px-2 py-1 rounded-full border border-slate-200/50 cursor-default shadow-inner">
             V4.0 Core
           </span>
        </div>
      </nav>
      {/* Refined Mobile Navigation Footer Floating look */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-12px_40px_rgba(0,0,0,0.06)] flex justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ href, label, Icon }) => {
          const active = path === href
          return (
            <Link key={href} href={href} className={`nav-item relative flex-1 flex flex-col items-center justify-center gap-1.5 pt-3 pb-3 text-[10px] font-bold tracking-wide transition-all ${active ? 'text-indigo-600 -translate-y-1' : 'text-slate-400 hover:text-slate-700'}`}>
              <Icon size={18} className={active ? 'drop-shadow-sm' : ''} />
              <span>{label}</span>
              {active && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_1px_4px_rgba(99,102,241,0.5)]" />}
            </Link>
          )
        })}
      </nav>
    </>
  )
}